import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  // These stay in node_modules at runtime rather than being bundled:
  //  - vscode: provided by the extension host
  //  - puppeteer / @puppeteer/browsers: heavy; loaded via dynamic import (browser.ts)
  //  - shiki: ESM-only; loaded via a preserved dynamic import (converter.ts)
  external: ['vscode', 'puppeteer', '@puppeteer/browsers', 'shiki'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: !production,
  minify: production,
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes…');
} else {
  await esbuild.build(buildOptions);
  console.log('Build complete.');
}
