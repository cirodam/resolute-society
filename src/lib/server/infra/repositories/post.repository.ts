import type postgres from 'postgres';

export interface PostRow {
	id: string;
	title: string;
	body: string;
	created_at: string;
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
				person.given_name as author_given_name,
				person.surname as author_surname,
				person.handle as author_handle
			FROM post p
			JOIN person ON p.author_id = person.id
			WHERE p.board_type = 'society'
			  AND p.board_id = ${societyId}
			  AND p.deleted_at IS NULL
			ORDER BY p.created_at DESC
			LIMIT 10`;
	}

	async createSocietyPost(params: {
		postId: string;
		societyId: string;
		authorId: string;
		title: string;
		body: string;
	}): Promise<void> {
		await this.sql`
			INSERT INTO post (id, board_type, board_id, author_id, title, body)
			VALUES (${params.postId}, 'society', ${params.societyId}, ${params.authorId}, ${params.title}, ${params.body})`;
	}
}
