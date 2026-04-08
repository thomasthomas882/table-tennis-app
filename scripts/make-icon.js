#!/usr/bin/env node
'use strict';

const sharp = require('sharp');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'build', 'icon.svg');
const outDir = path.join(__dirname, '..', 'build');
const icoPath = path.join(outDir, 'icon.ico');

const sizes = [256, 48, 32, 16];

async function main() {
  const svgBuffer = fs.readFileSync(svgPath);

  // Render PNG at each size
  const pngPaths = [];
  for (const size of sizes) {
    const pngPath = path.join(outDir, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    console.log(`Rendered ${size}x${size} PNG -> ${pngPath}`);
    pngPaths.push(pngPath);
  }

  // Combine PNGs into ICO
  console.log('Combining PNGs into ICO...');
  const icoBuffer = await pngToIco(pngPaths);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`ICO file written -> ${icoPath} (${icoBuffer.length} bytes)`);

  // Clean up temporary PNG files (keep 256 for reference)
  for (const size of [48, 32, 16]) {
    const pngPath = path.join(outDir, `icon-${size}.png`);
    fs.unlinkSync(pngPath);
  }
  console.log('Cleaned up temporary PNG files (kept icon-256.png for reference).');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
