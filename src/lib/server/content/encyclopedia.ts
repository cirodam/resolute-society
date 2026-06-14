import { createContentLoader, type ContentMeta, type ContentEntry } from './markdown-content';

export type EncyclopediaEntryMeta = ContentMeta;
export type EncyclopediaEntry = ContentEntry;
const modules = import.meta.glob('/src/lib/content/encyclopedia/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const loader = createContentLoader(modules, 'Read this encyclopedia entry.', '/src/lib/content/encyclopedia/');

export const listEncyclopediaEntries = loader.list;
export const getEncyclopediaEntry = loader.get;
