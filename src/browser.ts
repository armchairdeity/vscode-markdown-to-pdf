import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

type Puppeteer = typeof import('puppeteer');
type Browser = import('puppeteer').Browser;

let puppeteerPromise: Promise<Puppeteer> | undefined;
function loadPuppeteer(): Promise<Puppeteer> {
  // puppeteer is kept external (see esbuild.mjs) and loaded via a preserved
  // dynamic import so its large CJS bundle stays out of dist/extension.js.
  return (puppeteerPromise ??= import('puppeteer'));
}

// Release channels of an already-installed browser to try, in order, before
// falling back to a downloaded Chromium. puppeteer.launch({ channel }) resolves
// these from the system and throws quickly if the channel isn't installed.
const SYSTEM_CHANNELS = ['chrome', 'msedge', 'chrome-beta'] as const;

/**
 * Returns a launcher that resolves a usable browser using a hybrid strategy:
 *   1. An installed system browser (Chrome / Edge).
 *   2. Chromium already downloaded into the extension's global storage.
 *   3. Otherwise, download Chromium once (with a progress notification) and use it.
 */
export function createBrowserLauncher(
  context: vscode.ExtensionContext
): () => Promise<Browser> {
  return async () => {
    const puppeteer = (await loadPuppeteer()).default;

    // 1. Installed system browsers, then puppeteer's own cached Chromium (if any).
    for (const channel of SYSTEM_CHANNELS) {
      try {
        return await puppeteer.launch({ headless: true, channel });
      } catch {
        // channel not installed — try the next
      }
    }
    try {
      return await puppeteer.launch({ headless: true });
    } catch {
      // no cached Chromium either — fall through to download
    }

    // 2 & 3. Download Chromium into the extension's storage if not already present.
    const executablePath = await ensureDownloadedChromium(context);
    return puppeteer.launch({ headless: true, executablePath });
  };
}

async function ensureDownloadedChromium(context: vscode.ExtensionContext): Promise<string> {
  const mod = await import('@puppeteer/browsers');
  // @puppeteer/browsers is CJS; named exports come through on the namespace,
  // but fall back to `default` for robustness across loaders.
  const browsers = (mod as { default?: typeof mod }).default ?? mod;
  const { install, computeExecutablePath, detectBrowserPlatform, resolveBuildId, Browser } =
    browsers;

  const cacheDir = path.join(context.globalStorageUri.fsPath, 'chromium');
  fs.mkdirSync(cacheDir, { recursive: true });

  const platform = detectBrowserPlatform();
  if (!platform) {
    throw new Error('No compatible browser found and this platform is unsupported for download.');
  }

  const buildId = await resolveBuildId(Browser.CHROME, platform, 'stable');
  const executablePath = computeExecutablePath({ browser: Browser.CHROME, buildId, cacheDir });
  if (fs.existsSync(executablePath)) {
    return executablePath;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Markdown to PDF: downloading Chromium (one-time setup)…',
      cancellable: false,
    },
    async (progress) => {
      let lastPct = 0;
      await install({
        browser: Browser.CHROME,
        buildId,
        cacheDir,
        downloadProgressCallback: (downloadedBytes: number, totalBytes: number) => {
          if (!totalBytes) return;
          const pct = Math.round((downloadedBytes / totalBytes) * 100);
          if (pct > lastPct) {
            progress.report({ message: `${pct}%`, increment: pct - lastPct });
            lastPct = pct;
          }
        },
      });
    }
  );

  return executablePath;
}
