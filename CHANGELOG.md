# Changelog

All notable changes to **Markdown to PDF (Shiki)** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0]

### Added
- **Editor-accurate code highlighting with [Shiki](https://shiki.style).** Fenced
  code blocks now render using the same TextMate grammars and VS Code themes the
  editor ships, so exported code matches what you see in VS Code — across hundreds
  of languages.
- **New code-block themes.** `codeBlocks.theme` now offers popular Shiki/VS Code
  themes including the built-in **Light+** / **Dark+**, `github-light`,
  `github-dark`, `dracula`, `nord`, `monokai`, `one-dark-pro`, Catppuccin,
  Vitesse, Solarized, and more. Default: `github-light`.
- **Robust Chromium resolution.** On first export the extension uses an installed
  Chrome/Edge if present, then a previously downloaded Chromium, and otherwise
  downloads Chromium once into the extension's storage (with a progress
  notification). This makes exporting work on a fresh install with no manual setup.
- Marketplace icon, gallery banner, keywords, and bug/homepage links.

### Changed
- Long lines in code blocks now wrap instead of being clipped at the page edge.
- Code-block output is self-contained (inline colors and background), so no
  separate highlight stylesheet is injected.

### Removed
- highlight.js and marked-highlight (replaced by Shiki).

## [0.1.0]

### Added
- Initial release: export Markdown to PDF from the Explorer context menu and the
  editor title bar, with **Export to PDF** and **Export to PDF As…**.
- GitHub-flavored Markdown rendering via [marked](https://marked.js.org/).
- YAML front matter support (metadata box, table, or code-block styles).
- Configurable page size, margins, base stylesheet (built-in, custom file, or URL),
  overwrite behavior, and open-after-export.

[0.2.0]: https://github.com/armchairdeity/vscode-markdown-to-pdf/releases/tag/v0.2.0
[0.1.0]: https://github.com/armchairdeity/vscode-markdown-to-pdf/releases/tag/v0.1.0
