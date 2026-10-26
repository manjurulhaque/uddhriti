import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotsDir = path.join(__dirname, "../public/screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function getDesktopSvg() {
  return `
<svg width="1280" height="720" viewBox="0 0 1280 720" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#faf5ee"/>
      <stop offset="100%" stop-color="#f0e6d6"/>
    </linearGradient>
    <filter id="cardShadow" x="-2%" y="-2%" width="104%" height="108%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#212529" flood-opacity="0.08"/>
    </filter>
  </defs>

  <!-- Canvas Background -->
  <rect width="1280" height="720" fill="url(#bgGrad)"/>

  <!-- Top Navigation Header -->
  <rect x="0" y="0" width="1280" height="72" fill="#f5efe6" fill-opacity="0.95"/>
  <line x1="0" y1="72" x2="1280" y2="72" stroke="#212529" stroke-opacity="0.08" stroke-width="1"/>

  <!-- Brand Logo -->
  <rect x="64" y="18" width="36" height="36" rx="10" fill="#212529"/>
  <text x="82" y="42" font-family="'Times New Roman', serif" font-size="20" font-weight="bold" font-style="italic" fill="#e9c46a" text-anchor="middle">U</text>
  <text x="110" y="38" font-family="'Times New Roman', serif" font-size="20" font-weight="bold" fill="#212529">Uddhriti</text>
  <text x="110" y="50" font-family="sans-serif" font-size="9" letter-spacing="2" fill="#71717a">QUOTES &amp; IDEAS</text>

  <!-- Nav Links -->
  <text x="250" y="42" font-family="sans-serif" font-size="14" font-weight="500" fill="#212529">Quotes</text>
  <text x="325" y="42" font-family="sans-serif" font-size="14" font-weight="500" fill="#71717a">Authors</text>
  <text x="400" y="42" font-family="sans-serif" font-size="14" font-weight="500" fill="#71717a">Categories</text>
  <text x="495" y="42" font-family="sans-serif" font-size="14" font-weight="500" fill="#71717a">Tags</text>

  <!-- Search pill -->
  <rect x="1000" y="18" width="216" height="36" rx="18" fill="#ffffff" fill-opacity="0.8" stroke="#212529" stroke-opacity="0.12"/>
  <text x="1025" y="41" font-family="sans-serif" font-size="12" fill="#71717a">Search quotes, thinkers...</text>
  <rect x="1178" y="24" width="26" height="24" rx="6" fill="#f0e6d6"/>
  <text x="1191" y="40" font-family="sans-serif" font-size="11" fill="#71717a" text-anchor="middle">⌘K</text>

  <!-- Hero Section -->
  <text x="64" y="145" font-family="sans-serif" font-size="11" font-weight="600" letter-spacing="3" fill="#c76b3e">FEATURED REFLECTION</text>
  <text x="64" y="188" font-family="'Times New Roman', serif" font-size="38" font-weight="bold" fill="#212529">Timeless Words Across Human History</text>

  <!-- Main Hero Quote Card -->
  <g filter="url(#cardShadow)">
    <rect x="64" y="225" width="760" height="420" rx="20" fill="#ffffff" fill-opacity="0.85" stroke="#212529" stroke-opacity="0.08"/>
  </g>

  <!-- Quotation Mark -->
  <text x="110" y="320" font-family="Georgia, serif" font-size="90" fill="#e9c46a" opacity="0.45">“</text>

  <!-- Quote Text -->
  <text x="110" y="340" font-family="'Times New Roman', serif" font-size="28" font-style="italic" fill="#212529" font-weight="500">
    <tspan x="110" dy="0">You have power over your mind — not outside events.</tspan>
    <tspan x="110" dy="44">Realize this, and you will find strength.</tspan>
  </text>

  <!-- Author & Source -->
  <line x1="110" y1="440" x2="734" y2="440" stroke="#212529" stroke-opacity="0.08"/>
  <text x="110" y="480" font-family="sans-serif" font-size="17" font-weight="700" fill="#212529" letter-spacing="0.5">MARCUS AURELIUS</text>
  <text x="110" y="505" font-family="'Times New Roman', serif" font-size="15" font-style="italic" fill="#71717a">Meditations • Roman Emperor &amp; Stoic Philosopher</text>

  <!-- Tags -->
  <rect x="110" y="540" width="85" height="32" rx="16" fill="#c76b3e" fill-opacity="0.1"/>
  <text x="152" y="561" font-family="sans-serif" font-size="12" font-weight="600" fill="#c76b3e" text-anchor="middle">#Stoicism</text>

  <rect x="205" y="540" width="95" height="32" rx="16" fill="#c76b3e" fill-opacity="0.1"/>
  <text x="252" y="561" font-family="sans-serif" font-size="12" font-weight="600" fill="#c76b3e" text-anchor="middle">#Resilience</text>

  <rect x="310" y="540" width="85" height="32" rx="16" fill="#c76b3e" fill-opacity="0.1"/>
  <text x="352" y="561" font-family="sans-serif" font-size="12" font-weight="600" fill="#c76b3e" text-anchor="middle">#Wisdom</text>

  <!-- Right Side Column: Trending Quotes Mini Cards -->
  <g filter="url(#cardShadow)">
    <rect x="856" y="225" width="360" height="195" rx="16" fill="#ffffff" fill-opacity="0.75" stroke="#212529" stroke-opacity="0.06"/>
  </g>
  <text x="886" y="265" font-family="sans-serif" font-size="10" font-weight="600" letter-spacing="2" fill="#c76b3e">TRENDING</text>
  <text x="886" y="300" font-family="'Times New Roman', serif" font-size="17" font-style="italic" fill="#212529">
    <tspan x="886" dy="0">“Silence is an ocean. Speech is a river.</tspan>
    <tspan x="886" dy="25">When the ocean searches for you, don’t</tspan>
    <tspan x="886" dy="25">walk into the river.”</tspan>
  </text>
  <text x="886" y="395" font-family="sans-serif" font-size="12" font-weight="700" fill="#71717a">RUMI</text>

  <g filter="url(#cardShadow)">
    <rect x="856" y="445" width="360" height="200" rx="16" fill="#ffffff" fill-opacity="0.75" stroke="#212529" stroke-opacity="0.06"/>
  </g>
  <text x="886" y="485" font-family="sans-serif" font-size="10" font-weight="600" letter-spacing="2" fill="#c76b3e">PERSPECTIVE</text>
  <text x="886" y="520" font-family="'Times New Roman', serif" font-size="17" font-style="italic" fill="#212529">
    <tspan x="886" dy="0">“Clouds come floating into my life, no</tspan>
    <tspan x="886" dy="25">longer to carry rain, but to add color</tspan>
    <tspan x="886" dy="25">to my sunset sky.”</tspan>
  </text>
  <text x="886" y="615" font-family="sans-serif" font-size="12" font-weight="700" fill="#71717a">RABINDRANATH TAGORE</text>
</svg>
`;
}

function getMobileSvg() {
  return `
<svg width="750" height="1334" viewBox="0 0 750 1334" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradMobile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#faf5ee"/>
      <stop offset="100%" stop-color="#f0e6d6"/>
    </linearGradient>
    <filter id="mCardShadow" x="-2%" y="-2%" width="104%" height="106%">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#212529" flood-opacity="0.07"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="750" height="1334" fill="url(#bgGradMobile)"/>

  <!-- Status Bar & Mobile Header -->
  <rect x="0" y="0" width="750" height="110" fill="#f5efe6" fill-opacity="0.95"/>
  <line x1="0" y1="110" x2="750" y2="110" stroke="#212529" stroke-opacity="0.08" stroke-width="1"/>

  <!-- Brand -->
  <rect x="44" y="38" width="48" height="48" rx="14" fill="#212529"/>
  <text x="68" y="71" font-family="'Times New Roman', serif" font-size="28" font-weight="bold" font-style="italic" fill="#e9c46a" text-anchor="middle">U</text>
  <text x="108" y="66" font-family="'Times New Roman', serif" font-size="26" font-weight="bold" fill="#212529">Uddhriti</text>
  <text x="108" y="82" font-family="sans-serif" font-size="11" letter-spacing="2" fill="#71717a">QUOTES &amp; IDEAS</text>

  <!-- PWA Pill -->
  <rect x="580" y="44" width="126" height="38" rx="19" fill="#c76b3e" fill-opacity="0.12"/>
  <text x="643" y="68" font-family="sans-serif" font-size="13" font-weight="700" fill="#c76b3e" text-anchor="middle">✦ SANCTUARY</text>

  <!-- Hero Header -->
  <text x="44" y="170" font-family="sans-serif" font-size="14" font-weight="600" letter-spacing="3" fill="#c76b3e">DAILY REFLECTION</text>
  <text x="44" y="220" font-family="'Times New Roman', serif" font-size="44" font-weight="bold" fill="#212529">Timeless Words for Today</text>

  <!-- Main Card -->
  <g filter="url(#mCardShadow)">
    <rect x="44" y="260" width="662" height="490" rx="28" fill="#ffffff" fill-opacity="0.9" stroke="#212529" stroke-opacity="0.08"/>
  </g>

  <!-- Quote Mark -->
  <text x="84" y="360" font-family="Georgia, serif" font-size="100" fill="#e9c46a" opacity="0.45">“</text>

  <!-- Quote Text -->
  <text x="84" y="390" font-family="'Times New Roman', serif" font-size="33" font-style="italic" fill="#212529" font-weight="500">
    <tspan x="84" dy="0">You have power over your mind —</tspan>
    <tspan x="84" dy="52">not outside events. Realize this,</tspan>
    <tspan x="84" dy="52">and you will find strength.</tspan>
  </text>

  <!-- Divider -->
  <line x1="84" y1="550" x2="666" y2="550" stroke="#212529" stroke-opacity="0.08"/>

  <!-- Author -->
  <text x="84" y="600" font-family="sans-serif" font-size="20" font-weight="700" fill="#212529">MARCUS AURELIUS</text>
  <text x="84" y="632" font-family="'Times New Roman', serif" font-size="18" font-style="italic" fill="#71717a">Meditations • Roman Emperor</text>

  <!-- Tags -->
  <rect x="84" y="666" width="115" height="42" rx="21" fill="#c76b3e" fill-opacity="0.1"/>
  <text x="141" y="693" font-family="sans-serif" font-size="15" font-weight="600" fill="#c76b3e" text-anchor="middle">#Stoicism</text>

  <rect x="215" y="666" width="125" height="42" rx="21" fill="#c76b3e" fill-opacity="0.1"/>
  <text x="277" y="693" font-family="sans-serif" font-size="15" font-weight="600" fill="#c76b3e" text-anchor="middle">#Resilience</text>

  <!-- Second Card -->
  <g filter="url(#mCardShadow)">
    <rect x="44" y="780" width="662" height="410" rx="28" fill="#ffffff" fill-opacity="0.85" stroke="#212529" stroke-opacity="0.08"/>
  </g>

  <text x="84" y="870" font-family="Georgia, serif" font-size="80" fill="#e9c46a" opacity="0.4">“</text>
  <text x="84" y="900" font-family="'Times New Roman', serif" font-size="31" font-style="italic" fill="#212529">
    <tspan x="84" dy="0">Silence is an ocean. Speech</tspan>
    <tspan x="84" dy="48">is a river. When the ocean</tspan>
    <tspan x="84" dy="48">searches for you, don’t walk</tspan>
    <tspan x="84" dy="48">into the river.</tspan>
  </text>
  <text x="84" y="1135" font-family="sans-serif" font-size="19" font-weight="700" fill="#71717a">RUMI</text>

  <!-- Mobile Bottom Tab Bar -->
  <rect x="0" y="1224" width="750" height="110" fill="#f5efe6" fill-opacity="0.96"/>
  <line x1="0" y1="1224" x2="750" y2="1224" stroke="#212529" stroke-opacity="0.08" stroke-width="1"/>

  <text x="94" y="1285" font-family="sans-serif" font-size="15" font-weight="700" fill="#c76b3e" text-anchor="middle">✦ Home</text>
  <text x="281" y="1285" font-family="sans-serif" font-size="15" font-weight="500" fill="#71717a" text-anchor="middle">Quotes</text>
  <text x="468" y="1285" font-family="sans-serif" font-size="15" font-weight="500" fill="#71717a" text-anchor="middle">Authors</text>
  <text x="655" y="1285" font-family="sans-serif" font-size="15" font-weight="500" fill="#71717a" text-anchor="middle">Saved</text>
</svg>
`;
}

async function generateScreenshots() {
  const desktopSvg = getDesktopSvg();
  const mobileSvg = getMobileSvg();

  await sharp(Buffer.from(desktopSvg))
    .resize(1280, 720)
    .png()
    .toFile(path.join(screenshotsDir, "desktop.png"));

  await sharp(Buffer.from(mobileSvg))
    .resize(750, 1334)
    .png()
    .toFile(path.join(screenshotsDir, "mobile.png"));

  console.log("Successfully generated PWA screenshots in public/screenshots/");
}

generateScreenshots().catch((err) => {
  console.error("Error generating screenshots:", err);
  process.exit(1);
});
