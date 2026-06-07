import { json } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';

export async function DELETE({ params }: { params: { id: string } }) {
	getRepositories().roadGraph.deleteNode(params.id);
	return json({ ok: true });
}
