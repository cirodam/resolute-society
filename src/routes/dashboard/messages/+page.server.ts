import { error, fail, redirect } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { parsePage, pageOffset, totalPages } from '$lib/server/utils/pagination';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 25;

type MessageListItem = {
	id: string;
	subject: string;
	body: string;
	created_at: string;
	read_at: string | null;
	address: string;
};

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.person) {
		throw redirect(303, '/login');
	}

	const view = url.searchParams.get('view') || 'inbox';
	const page = parsePage(url);
	const offset = pageOffset(page, PAGE_SIZE);
	const repositories = getRepositories();
	const personId = locals.person.id;

	let messages: MessageListItem[] = [];
	let total = 0;

	if (view === 'inbox') {
		[messages, total] = await Promise.all([
			repositories.messages.listInboxMessages(personId, PAGE_SIZE, offset).then(rows => rows.map(m => ({
				id: m.id, subject: m.subject, body: m.body, created_at: m.created_at,
				read_at: m.read_at, address: `${m.handle}@${m.society_handle}`
			}))),
			repositories.messages.countInboxMessages(personId)
		]);
	} else if (view === 'sent') {
		[messages, total] = await Promise.all([
			repositories.messages.listSentMessages(personId, PAGE_SIZE, offset).then(rows => rows.map(m => ({
				id: m.id, subject: m.subject, body: m.body, created_at: m.created_at,
				read_at: m.read_at, address: `${m.handle}@${m.society_handle}`
			}))),
			repositories.messages.countSentMessages(personId)
		]);
	} else if (view === 'archive') {
		[messages, total] = await Promise.all([
			repositories.messages.listArchivedMessages(personId, PAGE_SIZE, offset).then(rows => rows.map(m => ({
				id: m.id, subject: m.subject, body: m.body, created_at: m.created_at,
				read_at: m.read_at, address: m.other_person_address
			}))),
			repositories.messages.countArchivedMessages(personId)
		]);
	} else {
		throw error(400, 'Invalid view');
	}

	return {
		view,
		messages,
		page,
		totalPages: totalPages(total, PAGE_SIZE),
		unreadCount: await repositories.messages.getUnreadCount(personId)
	};
};

export const actions = {
	sendMessage: async ({ request, locals }) => {
		if (!locals.person) {
			return fail(401, { error: 'Not authenticated' });
		}

		const data = await request.formData();
		const recipientAddress = data.get('recipient')?.toString().trim();
		const subject = data.get('subject')?.toString();
		const body = data.get('body')?.toString();

		if (!recipientAddress || !subject || !body) {
			return fail(400, { sendError: 'All fields are required' });
		}

		let resolvedAddress = recipientAddress;
		if (!recipientAddress.includes('@')) {
			const society = await getRepositories().societies.findDetailById(resolveSocietyId(undefined));
			if (!society) return fail(500, { sendError: 'Society not found' });
			resolvedAddress = `${recipientAddress}@${society.handle}`;
		}

		const [handle, societyHandle] = resolvedAddress.split('@');
		if (!handle || !societyHandle) {
			return fail(400, { sendError: 'Invalid address format. Use: handle@society-handle' });
		}

		const repositories = getRepositories();
		const recipient = await repositories.messages.findMessageRecipient(handle, societyHandle);

		if (!recipient) {
			return fail(400, { sendError: 'Recipient not found' });
		}

		await repositories.messages.sendMessage({
			senderId: locals.person.id,
			recipientId: recipient.type === 'person' ? recipient.id : null,
			recipientAssociationId: recipient.type === 'association' ? recipient.id : null,
			subject,
			body
		});

		return { sendSuccess: true };
	},

	markAsRead: async ({ request, locals }) => {
		if (!locals.person) {
			return fail(401, { error: 'Not authenticated' });
		}

		const data = await request.formData();
		const messageId = data.get('message_id')?.toString();

		if (!messageId) {
			return fail(400, { error: 'Invalid message ID' });
		}

		const repositories = getRepositories();
		if (!(await repositories.messages.findOwnedMessage(messageId, locals.person.id))) {
			return fail(403, { error: 'Message not found' });
		}

		await repositories.messages.markAsRead(messageId);

		return { readSuccess: true };
	},

	archive: async ({ request, locals }) => {
		if (!locals.person) {
			return fail(401, { error: 'Not authenticated' });
		}

		const data = await request.formData();
		const messageId = data.get('message_id')?.toString();

		if (!messageId) {
			return fail(400, { error: 'Invalid message ID' });
		}

		const repositories = getRepositories();
		if (!(await repositories.messages.findVisibleMessage(messageId, locals.person.id))) {
			return fail(403, { error: 'Message not found' });
		}

		await repositories.messages.archive(messageId);

		return { archiveSuccess: true };
	}
} satisfies Actions;
