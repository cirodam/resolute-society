import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

export interface ContentMeta {
	slug: string;
	title: string;
	summary: string;
	category: string;
	order: number;
}

export interface ContentEntry extends ContentMeta {
	html: string;
}

interface ContentGroup {
	category: string;
	items: ContentMeta[];
}

interface ParsedMarkdown {
	title: string;
	summary: string;
	category: string;
	order: number;
	body: string;
}

const markdownParser = new MarkdownIt({ html: false, linkify: true, typographer: true });

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
	const trimmed = value?.trim();
	return trimmed || 'General';
}

function parseOrder(value: string | undefined): number {
	const parsed = Number.parseInt(value ?? '', 10);
	return Number.isNaN(parsed) ? 1000 : parsed;
}

function extractFrontmatter(markdown: string): { frontmatter: Record<string, string>; body: string } {
	const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!match) return { frontmatter: {}, body: markdown };

	const frontmatter = Object.fromEntries(
		match[1]
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line && line.includes(':'))
			.map((line) => {
				const sep = line.indexOf(':');
				const key = line.slice(0, sep).trim();
				const value = line.slice(sep + 1).trim().replace(/^['\"]|['\"]$/g, '');
				return [key, value];
			})
	);

	return { frontmatter, body: markdown.slice(match[0].length) };
}

function extractSummary(markdownBody: string, fallback: string): string {
	const firstParagraph = markdownBody
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0)
		.find((l) => !l.startsWith('#') && !l.startsWith('![') && !l.startsWith('>'));

	if (!firstParagraph) return fallback;
	return firstParagraph.length > 180 ? `${firstParagraph.slice(0, 177)}...` : firstParagraph;
}

function parseMarkdown(markdown: string, slug: string, fallbackSummary: string): ParsedMarkdown {
	const { frontmatter, body } = extractFrontmatter(markdown);
	const headingMatch = body.match(/^#\s+(.+)$/m);
	return {
		title: frontmatter.title || headingMatch?.[1]?.trim() || humanizeSlug(slug),
		summary: frontmatter.summary || extractSummary(body, fallbackSummary),
		category: normalizeCategory(frontmatter.category),
		order: parseOrder(frontmatter.order),
		body
	};
}

async function renderHtml(markdown: string): Promise<string> {
	return sanitizeHtml(markdownParser.render(markdown), {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
		allowedAttributes: {
			...sanitizeHtml.defaults.allowedAttributes,
			a: ['href', 'name', 'target', 'rel'],
			img: ['src', 'alt', 'title'],
			code: ['class']
		},
		allowedSchemes: ['http', 'https', 'mailto'],
		allowedSchemesAppliedToAttributes: ['href', 'src'],
		transformTags: {
			a: (tagName, attribs) => ({
				tagName,
				attribs: {
					...attribs,
					...(/^https?:\/\//i.test(attribs.href ?? '')
						? { target: '_blank', rel: 'noopener noreferrer' }
						: {})
				}
			})
		}
	});
}

function compareItems(a: ContentMeta, b: ContentMeta): number {
	return a.order !== b.order ? a.order - b.order : a.title.localeCompare(b.title);
}

export function createContentLoader(
	modules: Record<string, string>,
	fallbackSummary: string,
	contentDir: string
) {
	if (!contentDir.endsWith('/')) throw new Error(`contentDir must end with '/': ${contentDir}`);
	function list(): ContentMeta[] {
		return Object.entries(modules)
			.map(([path, markdown]) => {
				const slug = slugFromPath(path);
				const parsed = parseMarkdown(markdown, slug, fallbackSummary);
				return { slug, title: parsed.title, summary: parsed.summary, category: parsed.category, order: parsed.order };
			})
			.sort(compareItems);
	}

	function listGroups(): ContentGroup[] {
		const grouped = new Map<string, ContentMeta[]>();
		for (const item of list()) {
			const bucket = grouped.get(item.category) ?? [];
			bucket.push(item);
			grouped.set(item.category, bucket);
		}
		return Array.from(grouped.entries())
			.map(([category, items]) => ({ category, items: items.sort(compareItems) }))
			.sort((a, b) => a.category.localeCompare(b.category));
	}

	async function get(slug: string): Promise<ContentEntry | null> {
		const markdown = modules[`${contentDir}${slug}.md`];
		if (!markdown) return null;
		const parsed = parseMarkdown(markdown, slug, fallbackSummary);
		return {
			slug,
			title: parsed.title,
			summary: parsed.summary,
			category: parsed.category,
			order: parsed.order,
			html: await renderHtml(parsed.body)
		};
	}

	return { list, listGroups, get };
}
