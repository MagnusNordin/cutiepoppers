// Build-time image pipeline: responsive product images and Open Graph images.
import fs from "node:fs";
import path from "node:path";
import Image, { generateHTML } from "@11ty/eleventy-img";
import sharp from "sharp";

export const SRC_DIR = "src/images/products";
export const OUT_DIR = "_site";
const BACKGROUND = "#FFFFFF";

export const imageOptions = {
  widths: [320, 480, 720, 960],
  formats: ["avif", "webp", "jpeg"],
  outputDir: path.join(OUT_DIR, "img"),
  urlPath: "/img/",
  sharpAvifOptions: { quality: 50 },
  sharpWebpOptions: { quality: 62 },
  sharpJpegOptions: { quality: 72, mozjpeg: true },
  // Transparent PNG/WebP line drawings get white instead of black.
  transform: (s) => s.rotate().flatten({ background: BACKGROUND }),
};

export function imagePath(file) {
  return path.join(SRC_DIR, file);
}

export async function imageMetadata(file, widths = imageOptions.widths) {
  return Image(imagePath(file), { ...imageOptions, widths });
}

/** Responsive <picture> markup with width/height to avoid layout shift. */
export async function productImageHtml(file, alt, opts = {}) {
  const { sizes = "(min-width: 1024px) 25vw, 50vw", loading = "lazy", priority = false, className, widths } = opts;
  const metadata = await imageMetadata(file, widths);
  const attrs = {
    alt,
    sizes,
    loading: priority ? "eager" : loading,
    decoding: priority ? "sync" : "async",
  };
  if (priority) attrs.fetchpriority = "high";
  if (className) attrs.class = className;
  return generateHTML(metadata, attrs);
}

/** URL of the largest JPEG rendition, for JSON-LD and feeds. */
export async function largestJpegUrl(file) {
  const metadata = await imageMetadata(file);
  const jpegs = metadata.jpeg;
  return jpegs[jpegs.length - 1].url;
}

/** URL of a small JPEG rendition, for the cart (stored with the cart line). */
export async function thumbUrl(file) {
  const metadata = await imageMetadata(file, [320]);
  return metadata.jpeg[0].url;
}

/** 1200×630 social share image: product photo on the brand pink with an ink frame. */
export async function ogImage(slug, file) {
  const rel = `/og/${slug}.jpg`;
  const out = path.join(OUT_DIR, rel);
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(imagePath(file)).mtimeMs) return rel;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const photo = await sharp(imagePath(file))
    .rotate()
    .resize(520, 520, { fit: "cover" })
    .flatten({ background: BACKGROUND })
    .extend({ top: 6, bottom: 6, left: 6, right: 6, background: "#141014" })
    .toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#F8D7F2" } })
    .composite([
      { input: photo, top: 53, left: 620 },
      { input: Buffer.from(ogBadgeSvg()), top: 0, left: 0 },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
  return rel;
}

function ogBadgeSvg() {
  // Simple vector shapes only (no web fonts available to sharp).
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect x="0" y="0" width="1200" height="630" fill="none" stroke="#141014" stroke-width="12"/>
  <circle cx="300" cy="315" r="170" fill="#2433D9" stroke="#141014" stroke-width="6"/>
  <path d="M300 205 l26 80 h84 l-68 50 l26 80 l-68 -50 l-68 50 l26 -80 l-68 -50 h84 z" fill="#F8D7F2"/>
</svg>`;
}
