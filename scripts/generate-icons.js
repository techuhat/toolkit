#!/usr/bin/env node
/**
 * Generate PWA PNG icons from an SVG source using sharp.
 */
const fs = require('fs');
const path = require('path');

async function main() {
  const sharp = require('sharp');
  const root = process.cwd();
  const publicDir = path.join(root, 'public');
  const srcSvg = path.join(publicDir, 'favicon.svg');
  const outputs = [
    { file: 'apple-touch-icon-180.png', size: 180 },
    { file: 'icon-192.png', size: 192 },
    { file: 'icon-512.png', size: 512 },
  ];

  if (!fs.existsSync(srcSvg)) {
    console.error(`Source SVG not found: ${srcSvg}`);
    process.exit(1);
  }

  for (const out of outputs) {
    const dest = path.join(publicDir, out.file);
    console.log(`Generating ${out.file} (${out.size}x${out.size})...`);
    await sharp(srcSvg)
      .resize(out.size, out.size, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
      .png({ compressionLevel: 9 })
      .toFile(dest);
  }

  console.log('All icons generated into public/.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
