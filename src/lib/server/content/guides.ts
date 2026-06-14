import { createContentLoader, type ContentMeta, type ContentEntry } from './markdown-content';

export type GuideMeta = ContentMeta;
export type Guide = ContentEntry;
export interface GuideGroup { category: string; guides: GuideMeta[]; }

const modules = import.meta.glob('/src/lib/content/guides/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const loader = createContentLoader(modules, 'Read this guide.', '/src/lib/content/guides/');

export function listGuideGroups(): GuideGroup[] {
	return loader.listGroups().map(({ category, items }) => ({ category, guides: items }));
}

export const getGuide = loader.get;
