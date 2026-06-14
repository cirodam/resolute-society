import { createContentLoader, type ContentMeta, type ContentEntry } from './markdown-content';

export type EncyclopediaEntryMeta = ContentMeta;
export type EncyclopediaEntry = ContentEntry;
export interface EncyclopediaEntryGroup { category: string; entries: EncyclopediaEntryMeta[]; }

const modules = import.meta.glob('/src/lib/content/encyclopedia/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const loader = createContentLoader(modules, 'Read this encyclopedia entry.', '/src/lib/content/encyclopedia/');

export const listEncyclopediaEntries = loader.list;

export function listEncyclopediaEntryGroups(): EncyclopediaEntryGroup[] {
	return loader.listGroups().map(({ category, items }) => ({ category, entries: items }));
}

export const getEncyclopediaEntry = loader.get;
