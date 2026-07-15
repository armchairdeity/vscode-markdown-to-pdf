import * as fs from 'fs';
import * as path from 'path';
import { get as httpsGet } from 'https';
import { get as httpGet } from 'http';
import matter from 'gray-matter';
import { marked, Marked } from 'marked';
import type { Settings } from './settings';

// Shiki is ESM-only, so it is kept external (see esbuild.mjs) and loaded via a
// native dynamic import() that esbuild preserves in the CJS bundle. Shiki uses
// the same TextMate grammars and VS Code theme files that VS Code itself ships,
// so exported code blocks match the editor. Its output is self-contained HTML
// with inline colors/background — no separate highlight stylesheet is needed.
type Shiki = typeof import('shiki');
let shikiPromise: Promise<Shiki> | undefined;
function loadShiki(): Promise<Shiki> {
  return (shikiPromise ??= import('shiki'));
}

const FALLBACK_THEME = 'github-light';

async function highlightCode(code: string, lang: string | undefined, theme: string): Promise<string> {
  const { codeToHtml, bundledLanguages } = await loadShiki();
  const requested = lang?.toLowerCase().trim();
  const language = requested && requested in bundledLanguages ? requested : 'text';
  for (const attempt of [
    { lang: language, theme },
    { lang: 'text', theme },
    { lang: 'text', theme: FALLBACK_THEME },
  ]) {
    try {
      return await codeToHtml(code, attempt);
    } catch {
      // try the next, progressively safer, combination
    }
  }
  return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
}

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

function fetchUrlCss(url: string): Promise<string> {
  return new Promise((resolve) => {
    const get = url.startsWith('https') ? httpsGet : httpGet;
    get(url, (res) => {
      if (res.statusCode !== 200) { resolve(''); return; }
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', () => resolve(''));
  });
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

function frontMatterYaml(data: Record<string, unknown>): string {
  return Object.entries(data)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n');
}

// Renders the `table` and `metadata-box` front-matter styles. The `code-block`
// style is handled separately in buildHtml because it needs async Shiki.
function renderFrontMatter(data: Record<string, unknown>, style: string): string {
  switch (style) {
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

const CODE_PLACEHOLDER = (i: number) => `<!--MDPDF-CODE-${i}-->`;

async function buildHtml(
  markdownContent: string,
  settings: Settings,
  fetchedCss?: string
): Promise<string> {
  const { data: fmData, content: mdContent } = matter(markdownContent);

  // Collect fenced code blocks during a synchronous parse, emitting a
  // placeholder for each, then highlight them asynchronously with Shiki and
  // splice the results back in. This keeps marked's renderer synchronous while
  // still allowing Shiki's async, self-contained HTML output.
  const codeBlocks: { code: string; lang?: string }[] = [];
  const renderer = new marked.Renderer();
  if (settings.codeBlocks.enabled) {
    renderer.code = (code: unknown, infostring?: unknown): string => {
      // marked v12 passes (code, infostring); guard for token-object forms too.
      const text = typeof code === 'string' ? code : String((code as { text?: string })?.text ?? '');
      const info = typeof code === 'string' ? infostring : (code as { lang?: string })?.lang;
      const lang = String(info ?? '').trim().split(/\s+/)[0] || undefined;
      const idx = codeBlocks.push({ code: text, lang }) - 1;
      return `\n${CODE_PLACEHOLDER(idx)}\n`;
    };
  }

  const instance = new Marked({ gfm: true }, { renderer });
  let bodyHtml = instance.parse(mdContent) as string;

  if (settings.codeBlocks.enabled && codeBlocks.length > 0) {
    const rendered = await Promise.all(
      codeBlocks.map((b) => highlightCode(b.code, b.lang, settings.codeBlocks.theme))
    );
    bodyHtml = bodyHtml.replace(/<!--MDPDF-CODE-(\d+)-->/g, (_, i) => rendered[Number(i)] ?? '');
  }

  let fmHtml = '';
  if (settings.frontMatter.render && Object.keys(fmData).length > 0) {
    fmHtml =
      settings.frontMatter.style === 'code-block'
        ? await highlightCode(frontMatterYaml(fmData), 'yaml', settings.codeBlocks.theme)
        : renderFrontMatter(fmData, settings.frontMatter.style);
  }

  const markdownCss = fetchedCss ?? getMarkdownCss(settings.stylesheet);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
${markdownCss}
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
/* Shiki code blocks: self-contained inline colors/background. Wrap long lines
   so nothing is clipped off the printable page width. */
.markdown-body pre.shiki {
  padding: 12px 14px;
  border-radius: 6px;
  font-size: 85%;
  line-height: 1.45;
}
.markdown-body pre.shiki code {
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
  background: transparent;
  padding: 0;
}
</style>
</head>
<body class="markdown-body">
${fmHtml}
${bodyHtml}
</body>
</html>`;
}

// Resolves and launches a browser. Injected by the caller (see browser.ts) so
// the converter stays independent of how Chromium is located or downloaded.
export type LaunchBrowser = () => Promise<import('puppeteer').Browser>;

export async function convertToPdf(
  inputPath: string,
  outputPath: string,
  settings: Settings,
  launchBrowser: LaunchBrowser
): Promise<void> {
  const sourceDir = path.dirname(inputPath);
  const markdownContent = fs.readFileSync(inputPath, 'utf8');

  // Fetch remote stylesheet if the setting is an http/https URL.
  const fetchedCss = /^https?:\/\//i.test(settings.stylesheet)
    ? await fetchUrlCss(settings.stylesheet)
    : undefined;

  let html = await buildHtml(markdownContent, settings, fetchedCss);

  // When true, rewrites relative src attributes to absolute file:// URIs.
  // When false, relative images may still load because the temp HTML is
  // written alongside the source file — the browser resolves them naturally.
  if (settings.images.resolveRelativePaths) {
    html = resolveImagePaths(html, sourceDir);
  }

  const tempHtml = path.join(sourceDir, `.~mdpdf-${Date.now()}.html`);
  fs.writeFileSync(tempHtml, html, 'utf8');

  try {
    const browser = await launchBrowser();
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
