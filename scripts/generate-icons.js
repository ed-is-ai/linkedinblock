#!/usr/bin/env node
// Generates PNG icons from src/icons/icon.svg at 16, 48, 128px.
// Run once: node scripts/generate-icons.js
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, '../src/icons/icon.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [16, 48, 128];
for (const size of sizes) {
  const outPath = join(__dirname, `../src/icons/icon-${size}.png`);
  await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
  console.log(`Generated icon-${size}.png`);
}
console.log('All icons generated.');
