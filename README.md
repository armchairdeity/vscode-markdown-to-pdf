# Markdown to PDF

A VS Code extension that exports Markdown files to PDF with GitHub-flavored Markdown rendering, syntax-highlighted code blocks, YAML front matter support, and configurable output.

## Usage

**From the Explorer:** Right-click any `.md` file → **Export to PDF** or **Export to PDF As…**

**From the editor:** Open a `.md` file and click the export icons in the editor title bar.

- **Export to PDF** — saves alongside the source file with the same name
- **Export to PDF As…** — opens a Save dialog to choose the output path

## Settings

| Setting | Default | Description |
|---|---|---|
| `codeBlocks.enabled` | `true` | Syntax-highlight fenced code blocks |
| `codeBlocks.theme` | `github` | highlight.js theme (`github`, `github-dark`, `atom-one-dark`, `monokai`, `vs2015`, `dracula`, `nord`) |
| `frontMatter.render` | `false` | Include YAML front matter in the PDF |
| `frontMatter.style` | `metadata-box` | Front matter style: `metadata-box`, `table`, or `code-block` |
| `page.size` | `Letter` | Paper size: `Letter`, `A4`, or `Legal` |
| `page.margins` | `normal` | Margins: `normal`, `narrow`, `wide`, or `none` |
| `stylesheet` | `github` | Base stylesheet: `github`, `none`, or an absolute path to a custom `.css` file |
| `output.overwrite` | `overwrite` | When the output file exists: `overwrite`, `prompt`, or `increment` |
| `output.openAfterExport` | `true` | Open the exported PDF in the system viewer |
| `images.resolveRelativePaths` | `true` | Rewrite relative image paths to absolute `file://` URIs |

All settings are under the `rypka-hauer.markdownToPdf` namespace.

## Stack

- [Puppeteer](https://pptr.dev/) (bundled Chromium) — PDF rendering
- [marked](https://marked.js.org/) v12 — Markdown parsing (GFM)
- [highlight.js](https://highlightjs.org/) v11 — Code block syntax highlighting
- [gray-matter](https://github.com/jonschlinkert/gray-matter) — YAML front matter parsing
- [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) — Default stylesheet

## Requirements

VS Code 1.90 or later. No other dependencies — Chromium is bundled with Puppeteer.

## License

MIT
