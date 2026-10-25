import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG definition for standard icon
function getStandardSvg(size) {
  return `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a2e33"/>
      <stop offset="100%" stop-color="#181a1d"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f4c78b"/>
      <stop offset="50%" stop-color="#e9c46a"/>
      <stop offset="100%" stop-color="#c76b3e"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" rx="108" fill="url(#bgGrad)"/>
  <rect x="12" y="12" width="488" height="488" rx="96" stroke="rgba(233, 196, 106, 0.15)" stroke-width="4"/>

  <!-- Subtle Quote Mark Motif in Background -->
  <text x="350" y="220" font-family="Georgia, serif" font-size="190" font-weight="900" fill="rgba(233, 196, 106, 0.07)" text-anchor="middle">”</text>

  <!-- Main "U" Serif Emblem -->
  <g filter="url(#shadow)">
    <text x="256" y="348" font-family="'Times New Roman', Times, Georgia, serif" font-size="280" font-style="italic" font-weight="bold" fill="url(#goldGrad)" text-anchor="middle">U</text>
  </g>

  <!-- Decorative Quotation Marks -->
  <path d="M 120 155 Q 110 135 125 115 Q 140 100 160 100 Q 185 100 185 125 Q 185 150 160 170 Q 135 190 120 220 L 105 210 Q 115 180 120 155 Z" fill="#e9c46a" opacity="0.9"/>
  <path d="M 175 155 Q 165 135 180 115 Q 195 100 215 100 Q 240 100 240 125 Q 240 150 215 170 Q 190 190 175 220 L 160 210 Q 170 180 175 155 Z" fill="#e9c46a" opacity="0.9"/>

  <!-- Bottom Accent Dot -->
  <circle cx="256" cy="415" r="9" fill="#c76b3e"/>
</svg>
`;
}

// SVG definition for maskable icon
function getMaskableSvg() {
  return `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgMaskable" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a2e33"/>
      <stop offset="100%" stop-color="#181a1d"/>
    </linearGradient>
    <linearGradient id="goldGradMaskable" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f4c78b"/>
      <stop offset="50%" stop-color="#e9c46a"/>
      <stop offset="100%" stop-color="#c76b3e"/>
    </linearGradient>
    <filter id="shadowMask" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- Full Bleed Background for Adaptive/Maskable Icons -->
  <rect width="512" height="512" fill="url(#bgMaskable)"/>

  <!-- Centered Content Scaled to Safe Zone (80% diameter) -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <circle cx="256" cy="256" r="230" stroke="rgba(233, 196, 106, 0.12)" stroke-width="4"/>
    
    <!-- Background Quote Watermark -->
    <text x="350" y="210" font-family="Georgia, serif" font-size="180" font-weight="900" fill="rgba(233, 196, 106, 0.08)" text-anchor="middle">”</text>

    <!-- Main "U" Emblem -->
    <g filter="url(#shadowMask)">
      <text x="256" y="340" font-family="'Times New Roman', Times, Georgia, serif" font-size="270" font-style="italic" font-weight="bold" fill="url(#goldGradMaskable)" text-anchor="middle">U</text>
    </g>

    <!-- Decorative Quotation Marks -->
    <path d="M 125 155 Q 115 135 130 115 Q 145 100 165 100 Q 190 100 190 125 Q 190 150 165 170 Q 140 190 125 220 L 110 210 Q 120 180 125 155 Z" fill="#e9c46a" opacity="0.9"/>
    <path d="M 180 155 Q 170 135 185 115 Q 200 100 220 100 Q 245 100 245 125 Q 245 150 220 170 Q 195 190 180 220 L 165 210 Q 175 180 180 155 Z" fill="#e9c46a" opacity="0.9"/>

    <!-- Bottom Accent Dot -->
    <circle cx="256" cy="405" r="9" fill="#c76b3e"/>
  </g>
</svg>
`;
}

async function generate() {
  const standardSvg = getStandardSvg(512);
  const maskableSvg = getMaskableSvg();

  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), standardSvg);

  // 512x512 standard
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512x512.png'));

  // 192x192 standard
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192x192.png'));

  // 180x180 apple touch icon
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));

  // 512x512 maskable
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'maskable-icon-512x512.png'));

  console.log('Successfully generated PWA icons in public/icons/');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
