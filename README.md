# Markdown to PDF

A VS Code extension that exports Markdown files to PDF with GitHub-flavored Markdown rendering, editor-accurate syntax-highlighted code blocks, YAML front matter support, and configurable output.

Code blocks are highlighted with [Shiki](https://shiki.style), which uses the same TextMate grammars and VS Code themes the editor itself ships — so your exported code looks like it does in VS Code, across hundreds of languages and popular themes (including the built-in **Light+** / **Dark+**).

## Usage

**From the Explorer:** Right-click any `.md` file → **Export to PDF** or **Export to PDF As…**

**From the editor:** Open a `.md` file and click the export icons in the editor title bar.

- **Export to PDF** — saves alongside the source file with the same name
- **Export to PDF As…** — opens a Save dialog to choose the output path

## Settings

| Setting | Default | Description |
|---|---|---|
| `codeBlocks.enabled` | `true` | Syntax-highlight fenced code blocks |
| `codeBlocks.theme` | `github-light` | Shiki/VS Code theme: `github-light`, `github-dark`, `light-plus`, `dark-plus`, `one-light`, `one-dark-pro`, `dracula`, `nord`, `monokai`, `solarized-light`, `solarized-dark`, `catppuccin-latte`, `catppuccin-mocha`, `vitesse-light`, `vitesse-dark`, `min-light`, `min-dark` |
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
- [Shiki](https://shiki.style/) — Code block syntax highlighting with VS Code grammars & themes
- [gray-matter](https://github.com/jonschlinkert/gray-matter) — YAML front matter parsing
- [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) — Default stylesheet

## Requirements

VS Code 1.90 or later. No other dependencies — Chromium is bundled with Puppeteer.

## License

MIT
