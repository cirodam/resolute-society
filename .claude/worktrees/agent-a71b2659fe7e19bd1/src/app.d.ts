// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			person?: {
				id: string;
				society_id: string;
				handle: string;
				name: string;
				membership_status: string;
				welcome_seen_at: string | null;
			};
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
