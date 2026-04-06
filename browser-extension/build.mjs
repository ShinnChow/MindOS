import { build, context } from 'esbuild';
import { cpSync, mkdirSync } from 'fs';

const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const shared = {
  bundle: true,
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
  target: ['chrome120'],
  format: 'esm',
};

// Entry points
const entries = [
  { in: 'src/popup/popup.ts', out: 'popup/popup' },
  { in: 'src/background/service-worker.ts', out: 'background/service-worker' },
  { in: 'src/content/extractor.ts', out: 'content/extractor' },
];

async function run() {
  mkdirSync('dist/popup', { recursive: true });
  mkdirSync('dist/background', { recursive: true });
  mkdirSync('dist/content', { recursive: true });
  mkdirSync('dist/icons', { recursive: true });

  // Copy static assets
  cpSync('src/manifest.json', 'dist/manifest.json');
  cpSync('src/popup/popup.html', 'dist/popup/popup.html');
  cpSync('src/popup/popup.css', 'dist/popup/popup.css');
  cpSync('src/icons', 'dist/icons', { recursive: true });

  const buildOptions = {
    ...shared,
    entryPoints: entries.map(e => ({ in: e.in, out: e.out })),
    outdir: 'dist',
  };

  if (isWatch) {
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.log('[watch] Watching for changes...');
  } else {
    await build(buildOptions);
    console.log('[build] Done.');
  }
}

run().catch(err => { console.error(err); process.exit(1); });
