import type postgres from 'postgres';

export interface PostReplyRow {
	id: string;
	body: string;
	created_at: string;
	author_given_name: string;
	author_surname: string;
	author_handle: string;
}

export interface PostRow {
	id: string;
	title: string;
	body: string;
	created_at: string;
	expires_at: string;
	author_given_name: string;
	author_surname: string;
	author_handle: string;
}

export class PostRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async listSocietyPosts(societyId: string): Promise<PostRow[]> {
		return await this.sql<PostRow[]>`
			SELECT
				p.id,
				p.title,
				p.body,
				p.created_at,
				p.expires_at,
				person.given_name as author_given_name,
				person.surname as author_surname,
				person.handle as author_handle
			FROM post p
			JOIN person ON p.author_id = person.id
			WHERE p.board_type = 'society'
			  AND p.board_id = ${societyId}
			  AND p.deleted_at IS NULL
			  AND p.expires_at > NOW()
			ORDER BY p.created_at DESC
			LIMIT 10`;
	}

	async findById(postId: string, societyId: string): Promise<PostRow | null> {
		const rows = await this.sql<PostRow[]>`
			SELECT
				p.id,
				p.title,
				p.body,
				p.created_at,
				p.expires_at,
				person.given_name as author_given_name,
				person.surname as author_surname,
				person.handle as author_handle
			FROM post p
			JOIN person ON p.author_id = person.id
			WHERE p.id = ${postId}
			  AND p.board_type = 'society'
			  AND p.board_id = ${societyId}
			  AND p.deleted_at IS NULL`;
		return rows[0] ?? null;
	}

	async listReplies(postId: string, limit: number, offset: number): Promise<PostReplyRow[]> {
		return await this.sql<PostReplyRow[]>`
			SELECT
				r.id,
				r.body,
				r.created_at,
				person.given_name as author_given_name,
				person.surname    as author_surname,
				person.handle     as author_handle
			FROM post_reply r
			JOIN person ON r.author_id = person.id
			WHERE r.post_id = ${postId}
			  AND r.deleted_at IS NULL
			ORDER BY r.created_at ASC
			LIMIT ${limit} OFFSET ${offset}`;
	}

	async countReplies(postId: string): Promise<number> {
		const rows = await this.sql<[{ count: string }]>`
			SELECT COUNT(*) as count FROM post_reply
			WHERE post_id = ${postId} AND deleted_at IS NULL`;
		return parseInt(rows[0].count, 10);
	}

	async createReply(params: {
		replyId: string;
		postId: string;
		authorId: string;
		body: string;
	}): Promise<void> {
		await this.sql`
			INSERT INTO post_reply (id, post_id, author_id, body)
			VALUES (${params.replyId}, ${params.postId}, ${params.authorId}, ${params.body})`;
	}

	async createSocietyPost(params: {
		postId: string;
		societyId: string;
		authorId: string;
		title: string;
		body: string;
		expiresAt?: string;
	}): Promise<void> {
		const expiresAt = params.expiresAt ?? null;
		await this.sql`
			INSERT INTO post (id, board_type, board_id, author_id, title, body, expires_at)
			VALUES (
				${params.postId}, 'society', ${params.societyId}, ${params.authorId}, ${params.title}, ${params.body},
				COALESCE(${expiresAt}::timestamptz, NOW() + INTERVAL '7 days')
			)`;
	}
}
