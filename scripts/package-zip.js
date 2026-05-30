#!/usr/bin/env node
// Zips the dist/ directory into a CWS-ready package.
// Run via: npm run package
import archiver from 'archiver';
import { createWriteStream, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
const version = pkg.version;

const distDir = resolve(__dirname, '../dist');
const outPath = join(distDir, `linkedin-blocker-v${version}.zip`);

const output = createWriteStream(outPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const kb = (archive.pointer() / 1024).toFixed(1);
  console.log(`\nPackaged: ${outPath}`);
  console.log(`Size: ${kb} KB`);
});

archive.on('error', (err) => { throw err; });
archive.pipe(output);

// Zip all dist/ contents at root level, excluding existing zip files
archive.glob('**/*', {
  cwd: distDir,
  ignore: ['*.zip'],
});

await archive.finalize();
