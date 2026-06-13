import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  // vscode and puppeteer stay in node_modules at runtime
  external: ['vscode', 'puppeteer'],
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
