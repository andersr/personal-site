// Generates the default social share card used when a page has no image of its own:
// the favicon mark, centered so unfurlers that crop to a square (e.g. Slack) still show all of it.
// Run from apps/site: node scripts/generate-og-image.mjs
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const WIDTH = 1600;
const HEIGHT = 840;
const MARK_SIZE = 640;

// Colors sampled from public/android-chrome-256x256.png
const CIRCLE_COLOR = "#e7e5e5";
const GLYPH_COLOR = "#e64a19";

const OUTPUT = "src/assets/images/og-default.png";

// The pinned-tab SVG is the favicon's "a" glyph alone, in a 272x272 viewBox
const glyphSvg = await readFile("public/safari-pinned-tab.svg", "utf8");
const markSvg = glyphSvg
  .replace('fill="#000000"', `fill="${GLYPH_COLOR}"`)
  .replace(
    /(<g transform)/,
    `<circle cx="136" cy="136" r="136" fill="${CIRCLE_COLOR}"/>$1`,
  )
  .replace(/width="[^"]*" height="[^"]*"/, `width="${MARK_SIZE}" height="${MARK_SIZE}"`);

const mark = await sharp(Buffer.from(markSvg)).png().toBuffer();

await sharp({
  create: { width: WIDTH, height: HEIGHT, channels: 3, background: "#ffffff" },
})
  .composite([
    {
      input: mark,
      left: (WIDTH - MARK_SIZE) / 2,
      top: (HEIGHT - MARK_SIZE) / 2,
    },
  ])
  .png()
  .toFile(OUTPUT);

console.info(`Wrote ${OUTPUT}`);
