import { getRepositories } from '$lib/server/infra/repositories';
import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const handle = data.get('handle')?.toString();
		const password = data.get('password')?.toString();

		if (!handle || !password) {
			return fail(400, { error: 'Handle and password are required' });
		}

		const person = await getRepositories().people.findLoginByHandle(handle);

		if (!person) {
			return fail(401, { error: 'Invalid handle or password' });
		}

		const valid = await bcrypt.compare(password, person.password_hash);
		if (!valid) {
			return fail(401, { error: 'Invalid handle or password' });
		}

		cookies.set('rs_session', person.id, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7 // 1 week
		});

		throw redirect(303, person.welcome_seen_at ? '/dashboard' : '/welcome');
	}
} satisfies Actions;
