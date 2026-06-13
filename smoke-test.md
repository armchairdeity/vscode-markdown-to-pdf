---
title: Markdown to PDF Smoke Test
author: Jared Rypka-Hauer
date: 2026-06-08
version: 0.1.0
---

# Markdown to PDF — Smoke Test

This file exercises every major feature of the extension.

## Front Matter

The YAML block above should appear as a styled box at the top of the PDF when `frontMatter.render` is enabled in settings.

## Relative Image

The image below should render (not be broken) when `images.resolveRelativePaths` is active — it lives alongside this `.md` file.

![ If you can see this, it didn't work or relative path resolution is deactivated.](./test-image.png)

## Inline Formatting

Plain text, **bold**, _italic_, **_bold-italic_**, `inline code`, and ~~strikethrough~~.

A [hyperlink](https://www.example.com) and an auto-link: <https://www.example.com>.

## Blockquote

> "The best way to test a PDF exporter is to export a PDF."
>
> — Nobody Famous

## Tables (GFM)

| Feature             | Status | Notes                          |
| ------------------- | ------ | ------------------------------ |
| Front matter        | ✅     | gray-matter v4                 |
| GFM tables          | ✅     | marked v12 + GFM flag          |
| Syntax highlighting | ✅     | highlight.js v11               |
| Relative images     | ✅     | temp HTML written alongside MD |
| Custom page size    | ✅     | Letter / A4 / Legal            |

## Code Blocks

TypeScript with syntax highlighting:

```typescript
interface ExportOptions {
	outputPath: string
	openAfterExport: boolean
}

async function exportMarkdown(options: ExportOptions): Promise<void> {
	const { outputPath, openAfterExport } = options
	await convertToPdf(inputPath, outputPath, getSettings())
	if (openAfterExport) {
		vscode.env.openExternal(vscode.Uri.file(outputPath))
	}
}
```

A shell snippet:

```bash
# Build and watch
npm run watch

# Package for distribution
npm run package
```

JSON:

```json
{
	"rypka-hauer.markdownToPdf.page.size": "Letter",
	"rypka-hauer.markdownToPdf.codeBlocks.theme": "github-dark",
	"rypka-hauer.markdownToPdf.output.openAfterExport": true
}
```

## Ordered & Unordered Lists

**Things that should look good in the PDF:**

1. GitHub-flavored Markdown stylesheet applied
2. Proper heading hierarchy (h1 → h6)
3. Consistent monospace font for code
4. Print-friendly margins from settings

**Things to verify manually:**

- [ ] Front matter box appears (enable `frontMatter.render`)
- [ ] Images are not broken
- [ ] Code blocks have colored syntax
- [ ] Table borders are visible
- [ ] Page size matches the setting

## Horizontal Rule

---

## Heading Levels

# H1 — Document Title

## H2 — Major Section

### H3 — Subsection

#### H4 — Minor Section

##### H5

###### H6

---

_End of smoke test._
