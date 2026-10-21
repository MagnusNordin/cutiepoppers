import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { largestJpegUrl, ogImage, OUT_DIR, productImageHtml } from "../../config/images.js";

// Uses a small real product photo (280×415 PNG with transparency).
const FILE = "swim-hut-black.png";

describe("productImageHtml", () => {
  it("renders a lazy <picture> with webp + jpeg and intrinsic size", async () => {
    const html = await productImageHtml(FILE, "Badhytt i svart", { widths: [160] });
    expect(html).toContain("<picture>");
    expect(html).toContain('type="image/webp"');
    expect(html).toMatch(/<img[^>]+alt="Badhytt i svart"/);
    expect(html).toContain('loading="lazy"');
    expect(html).toMatch(/width="160" height="\d+"/);
  });

  it("marks priority images eager with high fetch priority and passes a class", async () => {
    const html = await productImageHtml(FILE, "Badhytt", { widths: [160], priority: true, className: "x" });
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchpriority="high"');
    expect(html).toContain('class="x"');
  });
});

describe("largestJpegUrl", () => {
  it("returns the biggest jpeg rendition", async () => {
    expect(await largestJpegUrl(FILE)).toMatch(/^\/img\/.+-280\.jpeg$/);
  });
});

describe("ogImage", () => {
  it("writes a 1200×630 jpeg once and reuses it", async () => {
    const rel = await ogImage("unit-test", FILE);
    expect(rel).toBe("/og/unit-test.jpg");
    const file = path.join(OUT_DIR, rel);
    const { default: sharp } = await import("sharp");
    const meta = await sharp(file).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1200, 630, "jpeg"]);
    const mtime = fs.statSync(file).mtimeMs;
    await ogImage("unit-test", FILE);
    expect(fs.statSync(file).mtimeMs).toBe(mtime);
    fs.rmSync(file);
  });
});
