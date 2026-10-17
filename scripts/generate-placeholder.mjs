import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const destPath = path.join(process.cwd(), 'public', 'icons', 'placeholder.webp');

const svg = `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#3d2c1e"/>
      <stop offset="100%" stop-color="#1f1610"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe28a"/>
      <stop offset="50%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#997316"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <rect x="6" y="6" width="116" height="116" rx="26" fill="url(#bg)" stroke="url(#gold)" stroke-width="6" filter="url(#shadow)"/>
  <rect x="12" y="12" width="104" height="104" rx="20" fill="none" stroke="#5a422d" stroke-width="2" stroke-dasharray="4 4"/>
  <text x="64" y="85" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="64" font-weight="900" fill="url(#gold)" text-anchor="middle" filter="url(#shadow)">?</text>
</svg>`;

async function main() {
  await sharp(Buffer.from(svg))
    .webp({ quality: 90 })
    .toFile(destPath);
  console.log(`✅ Generated ${destPath} (${fs.statSync(destPath).size} bytes)`);
}

main().catch(console.error);
