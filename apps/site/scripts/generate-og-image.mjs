// Generates the default social share card used when a page has no image of its own.
// Run from apps/site: node scripts/generate-og-image.mjs
import sharp from "sharp";

const WIDTH = 1600;
const HEIGHT = 840;
const PHOTO_SIZE = 520;
const PADDING = (HEIGHT - PHOTO_SIZE) / 2;
const TEXT_X = PADDING * 2 + PHOTO_SIZE;

const PHOTO = "src/assets/images/homepage/ar-photo-web.jpg";
const OUTPUT = "src/assets/images/og-default.png";

const photo = await sharp(PHOTO)
  .resize(PHOTO_SIZE, PHOTO_SIZE)
  .composite([
    {
      input: Buffer.from(
        `<svg width="${PHOTO_SIZE}" height="${PHOTO_SIZE}"><circle cx="${PHOTO_SIZE / 2}" cy="${PHOTO_SIZE / 2}" r="${PHOTO_SIZE / 2}"/></svg>`,
      ),
      blend: "dest-in",
    },
  ])
  .png()
  .toBuffer();

const text = Buffer.from(`
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    text { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; fill: #111827; }
  </style>
  <text x="${TEXT_X}" y="360" font-size="88" font-weight="700">Anders Ramsay</text>
  <text x="${TEXT_X}" y="450" font-size="48" style="fill:#4b5563">Designing and Building</text>
  <text x="${TEXT_X}" y="512" font-size="48" style="fill:#4b5563">Digital Products</text>
  <text x="${TEXT_X}" y="620" font-size="40" style="fill:#2563eb">anders.co</text>
</svg>`);

await sharp({
  create: { width: WIDTH, height: HEIGHT, channels: 3, background: "#ffffff" },
})
  .composite([
    { input: photo, left: PADDING, top: PADDING },
    { input: text, left: 0, top: 0 },
  ])
  .png()
  .toFile(OUTPUT);

console.info(`Wrote ${OUTPUT}`);
