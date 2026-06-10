import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

export interface GuideMeta {
	slug: string;
	title: string;
	summary: string;
	category: string;
	order: number;
}

export interface Guide extends GuideMeta {
	html: string;
}

export interface GuideGroup {
	category: string;
	guides: GuideMeta[];
}

interface ParsedMarkdown {
	title?: string;
	summary?: string;
	category: string;
	order: number;
	body: string;
}

const guideModules = import.meta.glob('/src/lib/content/guides/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const markdownParser = new MarkdownIt({
	html: false,
	linkify: true,
	typographer: true
});

function slugFromPath(path: string): string {
	const fileName = path.split('/').pop() ?? '';
	return fileName.replace(/\.md$/i, '');
}

function humanizeSlug(slug: string): string {
	return slug
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function normalizeCategory(value: string | undefined): string {
	if (!value) return 'General';
	const trimmed = value.trim();
	return trimmed || 'General';
}

function parseOrder(value: string | undefined): number {
	if (!value) return 1000;
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? 1000 : parsed;
}

function extractFrontmatter(markdown: string): { frontmatter: Record<string, string>; body: string } {
	const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!match) {
		return { frontmatter: {}, body: markdown };
	}

	const frontmatter = Object.fromEntries(
		match[1]
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line && line.includes(':'))
			.map((line) => {
				const separatorIndex = line.indexOf(':');
				const key = line.slice(0, separatorIndex).trim();
				const value = line.slice(separatorIndex + 1).trim().replace(/^['\"]|['\"]$/g, '');
				return [key, value];
			})
	);

	return {
		frontmatter,
		body: markdown.slice(match[0].length)
	};
}

function extractSummary(markdownBody: string): string {
	const lines = markdownBody
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	const firstParagraph = lines.find((line) => !line.startsWith('#') && !line.startsWith('![') && !line.startsWith('>'));
	if (!firstParagraph) {
		return 'Read this guide.';
	}

	return firstParagraph.length > 180
		? `${firstParagraph.slice(0, 177)}...`
		: firstParagraph;
}

function parseMarkdown(markdown: string, slug: string): ParsedMarkdown {
	const { frontmatter, body } = extractFrontmatter(markdown);
	const headingMatch = body.match(/^#\s+(.+)$/m);
	const title = frontmatter.title || headingMatch?.[1]?.trim() || humanizeSlug(slug);
	const summary = frontmatter.summary || extractSummary(body);

	return {
		title,
		summary,
		category: normalizeCategory(frontmatter.category),
		order: parseOrder(frontmatter.order),
		body
	};
}

function compareGuides(a: GuideMeta, b: GuideMeta): number {
	if (a.order !== b.order) {
		return a.order - b.order;
	}
	return a.title.localeCompare(b.title);
}

async function renderHtml(markdown: string): Promise<string> {
	const parsed = markdownParser.render(markdown);

	return sanitizeHtml(parsed, {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
		allowedAttributes: {
			...sanitizeHtml.defaults.allowedAttributes,
			a: ['href', 'name', 'target', 'rel'],
			img: ['src', 'alt', 'title'],
			code: ['class']
		},
		allowedSchemes: ['http', 'https', 'mailto'],
		transformTags: {
			a: (tagName: string, attribs: Record<string, string>) => {
				const isExternal = /^https?:\/\//i.test(attribs.href ?? '');
				return {
					tagName,
					attribs: {
						...attribs,
						...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})
					}
				};
			}
		}
	});
}

export function listGuides(): GuideMeta[] {
	return Object.entries(guideModules)
		.map(([path, markdown]) => {
			const slug = slugFromPath(path);
			const parsed = parseMarkdown(markdown, slug);

			return {
				slug,
				title: parsed.title ?? humanizeSlug(slug),
				summary: parsed.summary ?? extractSummary(parsed.body),
				category: parsed.category,
				order: parsed.order
			} satisfies GuideMeta;
		})
		.sort(compareGuides);
}

export function listGuideGroups(): GuideGroup[] {
	const grouped = new Map<string, GuideMeta[]>();

	for (const guide of listGuides()) {
		const guides = grouped.get(guide.category) ?? [];
		guides.push(guide);
		grouped.set(guide.category, guides);
	}

	return Array.from(grouped.entries())
		.map(([category, guides]) => ({
			category,
			guides: guides.sort(compareGuides)
		}))
		.sort((a, b) => a.category.localeCompare(b.category));
}

export async function getGuide(slug: string): Promise<Guide | null> {
	const path = `/src/lib/content/guides/${slug}.md`;
	const markdown = guideModules[path];

	if (!markdown) {
		return null;
	}

	const parsed = parseMarkdown(markdown, slug);
	const html = await renderHtml(parsed.body);

	return {
		slug,
		title: parsed.title ?? humanizeSlug(slug),
		summary: parsed.summary ?? extractSummary(parsed.body),
		category: parsed.category,
		order: parsed.order,
		html
	};
}
