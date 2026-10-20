import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import configure, { assetHash } from "../../eleventy.config.js";

function fakeConfig() {
  const calls = { filters: {}, asyncFilters: {}, shortcodes: {}, globals: {}, passthrough: [], watch: [] };
  return {
    calls,
    addGlobalData: (k, v) => (calls.globals[k] = v),
    addPassthroughCopy: (m) => calls.passthrough.push(m),
    addWatchTarget: (t) => calls.watch.push(t),
    addFilter: (k, fn) => (calls.filters[k] = fn),
    addAsyncFilter: (k, fn) => (calls.asyncFilters[k] = fn),
    addAsyncShortcode: (k, fn) => (calls.shortcodes[k] = fn),
  };
}

describe("assetHash", () => {
  it("changes when a file changes and is stable otherwise", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cp-hash-"));
    fs.mkdirSync(path.join(dir, "sub"));
    fs.writeFileSync(path.join(dir, "sub", "a.css"), "a{}");
    const first = assetHash([dir]);
    expect(first).toMatch(/^[0-9a-f]{10}$/);
    expect(assetHash([dir])).toBe(first);
    fs.writeFileSync(path.join(dir, "sub", "a.css"), "a{color:red}");
    expect(assetHash([dir])).not.toBe(first);
    fs.rmSync(dir, { recursive: true });
  });
});

describe("eleventy config", () => {
  it("registers filters, shortcodes, versioned assets and the src/_site dirs", async () => {
    const cfg = fakeConfig();
    const result = configure(cfg);
    expect(result.dir).toMatchObject({ input: "src", output: "_site" });
    expect(cfg.calls.globals.assetBase).toMatch(/^\/v\/[0-9a-f]{10}$/);
    expect(cfg.calls.passthrough).toContainEqual({ "src/static": "/" });
    for (const name of ["kr", "size", "motifs", "jsonLd", "inCategory", "related", "pageTitle", "productTitle"]) {
      expect(cfg.calls.filters[name]).toBeTypeOf("function");
    }
    expect(cfg.calls.filters.kr(5000)).toBe("50 kr");
    expect(cfg.calls.filters.absoluteUrl("/a/", "https://x.se")).toBe("https://x.se/a/");
    expect(cfg.calls.globals.dots().dots).toHaveLength(5);
    expect(cfg.calls.filters.feedPrice(5000)).toBe("50.00 SEK");
    expect(Object.keys(cfg.calls.shortcodes)).toEqual(["productImage", "ogImage", "thumbUrl"]);
  });

  it("builds product JSON-LD with absolute image URLs", async () => {
    const cfg = fakeConfig();
    configure(cfg);
    const { default: site } = await import("../../src/_data/site.js");
    const ld = await cfg.calls.asyncFilters.productLd(
      { slug: "badhytt", name: "Badhytt", description: "x", inStock: true, images: [{ src: "swim-hut-black.png" }] },
      site,
    );
    expect(ld.image[0]).toMatch(/^https:\/\/cutiepoppers\.shop\/img\//);
  });

  it("resolves absolute image URLs", async () => {
    const cfg = fakeConfig();
    configure(cfg);
    expect(await cfg.calls.asyncFilters.imageUrl("swim-hut-black.png", "https://x.se")).toMatch(
      /^https:\/\/x\.se\/img\//,
    );
  });

  it("wires the image shortcodes", async () => {
    const cfg = fakeConfig();
    configure(cfg);
    const html = await cfg.calls.shortcodes.productImage("swim-hut-black.png", "Badhytt", { widths: [160] });
    expect(html).toContain("<picture>");
    expect(await cfg.calls.shortcodes.productImage("swim-hut-black.png", "Badhytt")).toContain("<picture>");
  });
});
