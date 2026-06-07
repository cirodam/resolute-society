import { error, fail, redirect } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import type { Actions, PageServerLoad } from './$types';

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
	const repositories = getRepositories();

	let messages: MessageListItem[] = [];

	if (view === 'inbox') {
		messages = repositories.messages.listInboxMessages(locals.person.id).map((message) => ({
			id: message.id,
			subject: message.subject,
			body: message.body,
			created_at: message.created_at,
			read_at: message.read_at,
			address: `${message.handle}@${message.society_handle}`
		}));
	} else if (view === 'sent') {
		messages = repositories.messages.listSentMessages(locals.person.id).map((message) => ({
			id: message.id,
			subject: message.subject,
			body: message.body,
			created_at: message.created_at,
			read_at: message.read_at,
			address: `${message.handle}@${message.society_handle}`
		}));
	} else if (view === 'archive') {
		messages = repositories.messages.listArchivedMessages(locals.person.id).map((message) => ({
			id: message.id,
			subject: message.subject,
			body: message.body,
			created_at: message.created_at,
			read_at: message.read_at,
			address: message.other_person_address
		}));
	} else {
		throw error(400, 'Invalid view');
	}

	return {
		view,
		messages,
		unreadCount: repositories.messages.getUnreadCount(locals.person.id)
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
			const society = getRepositories().societies.findDetailById(resolveSocietyId(undefined));
			if (!society) return fail(500, { sendError: 'Society not found' });
			resolvedAddress = `${recipientAddress}@${society.handle}`;
		}

		const [handle, societyHandle] = resolvedAddress.split('@');
		if (!handle || !societyHandle) {
			return fail(400, { sendError: 'Invalid address format. Use: handle@society-handle' });
		}

		const repositories = getRepositories();
		const recipient = repositories.messages.findRecipientByHandleAndSociety(handle, societyHandle);

		if (!recipient) {
			return fail(400, { sendError: 'Recipient not found' });
		}

		repositories.messages.sendMessage({
			senderId: locals.person.id,
			recipientId: recipient.id,
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
		if (!repositories.messages.findOwnedMessage(messageId, locals.person.id)) {
			return fail(403, { error: 'Message not found' });
		}

		repositories.messages.markAsRead(messageId);

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
		if (!repositories.messages.findVisibleMessage(messageId, locals.person.id)) {
			return fail(403, { error: 'Message not found' });
		}

		repositories.messages.archive(messageId);

		return { archiveSuccess: true };
	}
} satisfies Actions;
