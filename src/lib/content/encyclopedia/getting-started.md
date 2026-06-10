---
title: Encyclopedia: Getting Started
summary: How to add and maintain encyclopedia entries as Markdown files.
category: Handbook
order: 10
---

# Encyclopedia: Getting Started

The encyclopedia is file-based. Each entry lives in:

- `src/lib/content/encyclopedia/*.md`

Each file name becomes the entry URL slug.

- `getting-started.md` -> `/society/encyclopedia/getting-started`

## Frontmatter

You can define optional metadata at the top of a file:

```md
---
title: Your Entry Title
summary: One sentence summary for the index card.
---
```

If frontmatter is omitted, the app uses the first `# Heading` as the title and the first paragraph as summary.

## Authoring Tips

- Prefer one topic per entry.
- Use short sections with descriptive headings.
- Keep operational procedures specific and testable.
- Link related entries to build a connected knowledge base.
