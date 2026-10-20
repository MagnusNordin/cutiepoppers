// Checks on the generated _site (run `npm run build` first).
import fs from "node:fs";
import path from "node:path";
import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";

const SITE = "_site";

export function readPage(urlPath) {
  const file = urlPath.endsWith("/") ? path.join(SITE, urlPath, "index.html") : path.join(SITE, urlPath);
  return parseHTML(fs.readFileSync(file, "utf8")).document;
}

describe("start page", () => {
  const doc = readPage("/");

  it("has Swedish lang, one h1, a title and a description", () => {
    expect(doc.documentElement.getAttribute("lang")).toBe("sv");
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.title).toMatch(/Cutie Poppers/);
    expect(doc.querySelector('meta[name="description"]').getAttribute("content").length).toBeGreaterThan(50);
  });

  it("has a canonical URL on the production domain", () => {
    expect(doc.querySelector('link[rel="canonical"]').getAttribute("href")).toBe("https://cutiepoppers.shop/");
  });

  it("renders all 36 products", () => {
    expect(doc.querySelectorAll("[data-grid] .product-card")).toHaveLength(36);
  });

  it("gives every image alt text and intrinsic dimensions", () => {
    for (const img of doc.querySelectorAll("img")) {
      expect(img.getAttribute("alt"), img.outerHTML).toBeTruthy();
      expect(img.getAttribute("width"), img.outerHTML).toBeTruthy();
      expect(img.getAttribute("height"), img.outerHTML).toBeTruthy();
    }
  });

  it("references versioned CSS and JS that exist", () => {
    const refs = [
      ...[...doc.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute("href")),
      ...[...doc.querySelectorAll("script[src]")].map((s) => s.getAttribute("src")).filter((s) => s.startsWith("/")),
    ];
    expect(refs.length).toBeGreaterThan(1);
    for (const ref of refs) {
      expect(ref).toMatch(/^\/v\/[0-9a-f]{10}\//);
      expect(fs.existsSync(path.join(SITE, ref)), ref).toBe(true);
    }
  });

  it("has a valid Open Graph image", () => {
    const og = doc.querySelector('meta[property="og:image"]').getAttribute("content");
    expect(og).toMatch(/^https:\/\/cutiepoppers\.shop\/og\/.+\.jpg$/);
    expect(fs.existsSync(path.join(SITE, new URL(og).pathname))).toBe(true);
  });
});
