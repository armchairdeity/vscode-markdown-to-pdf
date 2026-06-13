import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { marked, Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import type { Settings } from './settings';

const MARGINS: Record<string, { top: string; right: string; bottom: string; left: string }> = {
  normal: { top: '1in',    right: '1in',    bottom: '1in',    left: '1in'    },
  narrow: { top: '0.5in',  right: '0.5in',  bottom: '0.5in',  left: '0.5in'  },
  wide:   { top: '1in',    right: '1.5in',  bottom: '1in',    left: '1.5in'  },
  none:   { top: '0',      right: '0',      bottom: '0',      left: '0'      },
};

// Paper widths at 96 dpi
const PAPER_WIDTH_PX: Record<string, number> = {
  Letter: 816,  // 8.5 in
  A4:     794,  // 210 mm
  Legal:  816,  // 8.5 in
};

// Total horizontal margin (left + right) at 96 dpi
const MARGIN_TOTAL_PX: Record<string, number> = {
  normal:  192,  // 2 × 1 in
  narrow:   96,  // 2 × 0.5 in
  wide:    288,  // 2 × 1.5 in
  none:      0,
};

// Screen-mode body padding (45 px × 2 sides) — used to offset the viewport
// so that container.clientWidth in page.evaluate() equals the print content width.
const BODY_PADDING_PX = 90;

function readBundledCss(relativePath: string): string {
  try {
    const resolved = require.resolve(relativePath);
    return fs.readFileSync(resolved, 'utf8');
  } catch {
    return '';
  }
}

function getMarkdownCss(stylesheet: string): string {
  if (stylesheet === 'none') return '';
  if (stylesheet === 'github') {
    return readBundledCss('github-markdown-css/github-markdown.css');
  }
  if (path.isAbsolute(stylesheet) && fs.existsSync(stylesheet)) {
    return fs.readFileSync(stylesheet, 'utf8');
  }
  return '';
}

function getHighlightCss(theme: string): string {
  // Normalise theme name: spaces → hyphens, lowercase
  const name = theme.toLowerCase().replace(/\s+/g, '-');
  return readBundledCss(`highlight.js/styles/${name}.css`);
}

function renderFrontMatter(data: Record<string, unknown>, style: string): string {
  switch (style) {
    case 'code-block': {
      const yaml = Object.entries(data)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join('\n');
      const highlighted = hljs.highlight(yaml, { language: 'yaml' }).value;
      return `<pre><code class="hljs language-yaml">${highlighted}</code></pre>`;
    }
    case 'table': {
      const rows = Object.entries(data)
        .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(String(v))}</td></tr>`)
        .join('');
      return `<table class="fm-table"><tbody>${rows}</tbody></table>`;
    }
    default: {
      // metadata-box
      const entries = Object.entries(data)
        .map(
          ([k, v]) =>
            `<div class="fm-entry"><span class="fm-key">${escapeHtml(k)}</span>` +
            `<span class="fm-value">${escapeHtml(String(v))}</span></div>`
        )
        .join('');
      return `<div class="fm-box">${entries}</div>`;
    }
  }
}

function resolveImagePaths(html: string, sourceDir: string): string {
  return html.replace(/(<img\s[^>]*\bsrc=")([^"]+)(")/gi, (match, pre, src, post) => {
    if (/^(https?:|data:|file:|\/)/i.test(src) || path.isAbsolute(src)) {
      return match;
    }
    return `${pre}file://${path.resolve(sourceDir, src)}${post}`;
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(markdownContent: string, settings: Settings): string {
  // Configure marked with GFM + optional highlight.js
  const markedOptions = settings.codeBlocks.enabled
    ? [
        markedHighlight({
          langPrefix: 'hljs language-',
          highlight(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
          },
        }),
      ]
    : [];

  const renderer = new marked.Renderer();
  const instance = new Marked({ gfm: true }, ...markedOptions, { renderer });

  const { data: fmData, content: mdContent } = matter(markdownContent);

  const bodyHtml = instance.parse(mdContent) as string;
  const fmHtml =
    settings.frontMatter.render && Object.keys(fmData).length > 0
      ? renderFrontMatter(fmData, settings.frontMatter.style)
      : '';

  const markdownCss = getMarkdownCss(settings.stylesheet);
  const highlightCss = settings.codeBlocks.enabled ? getHighlightCss(settings.codeBlocks.theme) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
${markdownCss}
${highlightCss}
body {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
}
@media print {
  body { max-width: none; padding: 0; }
}
.fm-box {
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 24px;
  font-family: ui-monospace, monospace;
  font-size: 13px;
}
.fm-entry { display: flex; gap: 12px; margin: 3px 0; }
.fm-key   { font-weight: 600; color: #57606a; min-width: 120px; }
.fm-value { color: #24292f; }
.fm-table { border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
.fm-table th,
.fm-table td { border: 1px solid #d0d7de; padding: 6px 12px; text-align: left; }
.fm-table th  { background: #f6f8fa; font-weight: 600; }
table { font-size: 12px; }
.markdown-body table th,
.markdown-body table td { padding: 3px 8px; }
td, th { overflow-wrap: break-word; }
</style>
</head>
<body class="markdown-body">
${fmHtml}
${bodyHtml}
</body>
</html>`;
}

export async function convertToPdf(
  inputPath: string,
  outputPath: string,
  settings: Settings
): Promise<void> {
  const sourceDir = path.dirname(inputPath);
  const markdownContent = fs.readFileSync(inputPath, 'utf8');
  let html = buildHtml(markdownContent, settings);

  if (settings.images.resolveRelativePaths) {
    html = resolveImagePaths(html, sourceDir);
  }

  const tempHtml = path.join(sourceDir, `.~mdpdf-${Date.now()}.html`);
  fs.writeFileSync(tempHtml, html, 'utf8');

  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({ headless: true });
    try {
      const page = await browser.newPage();

      // Viewport matches the printable content area so table measurements are accurate.
      const printContentW =
        PAPER_WIDTH_PX[settings.page.size] - MARGIN_TOTAL_PX[settings.page.margins];
      await page.setViewport({ width: printContentW + BODY_PADDING_PX, height: 1200 });

      await page.goto(`file://${tempHtml}`, { waitUntil: 'networkidle0' });

      await page.evaluate(() => {
        document.querySelectorAll<HTMLElement>('table').forEach((table) => {
          const container = table.parentElement ?? document.body;
          const availWidth = container.clientWidth;

          // Unconstrain to measure the table's intrinsic (natural) width.
          table.style.width = 'max-content';
          table.style.maxWidth = 'none';
          const naturalWidth = table.getBoundingClientRect().width;

          if (naturalWidth <= availWidth) {
            table.style.width = '';
            table.style.maxWidth = '';
          } else {
            const scale = availWidth / naturalWidth;
            const base = parseFloat(window.getComputedStyle(table).fontSize);
            table.style.fontSize = `${Math.max(9, Math.floor(base * scale))}px`;
            table.style.width = '100%';
            table.style.maxWidth = '100%';
          }
        });
      });
      await page.pdf({
        path: outputPath,
        format: settings.page.size,
        margin: MARGINS[settings.page.margins],
        printBackground: true,
      });
    } finally {
      await browser.close();
    }
  } finally {
    if (fs.existsSync(tempHtml)) {
      fs.unlinkSync(tempHtml);
    }
  }
}
