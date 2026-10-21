// SEO and integrity checks across every generated page (run `npm run build` first).
import fs from "node:fs";
import path from "node:path";
import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";

const SITE = "_site";
const ORIGIN = "https://cutiepoppers.shop";

function htmlFiles(dir = SITE) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(full);
    return e.name.endsWith(".html") ? [full] : [];
  });
}

const pages = htmlFiles().map((file) => {
  const rel = "/" + path.relative(SITE, file).replace(/\\/g, "/");
  const url = rel.endsWith("/index.html") ? rel.slice(0, -"index.html".length) : rel;
  return { file, url, doc: parseHTML(fs.readFileSync(file, "utf8")).document };
});
const byUrl = (u) => pages.find((p) => p.url === u);
const products = JSON.parse(fs.readFileSync("src/_data/products.json", "utf8"));
const categories = JSON.parse(fs.readFileSync("src/_data/categories.json", "utf8"));
const jsonLd = (doc) =>
  [...doc.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent));
const isNoindex = (doc) =>
  (doc.querySelector('meta[name="robots"]')?.getAttribute("content") || "").includes("noindex");

function existsInSite(urlPath) {
  const clean = decodeURIComponent(urlPath.split("#")[0].split("?")[0]);
  if (clean === "" || clean === "/") return fs.existsSync(path.join(SITE, "index.html"));
  const target = path.join(SITE, clean);
  return clean.endsWith("/") ? fs.existsSync(path.join(target, "index.html")) : fs.existsSync(target);
}

describe("every page", () => {
  it("found the pages", () => {
    expect(pages.length).toBeGreaterThanOrEqual(1 + products.length + categories.length + 5);
  });

  for (const { url, doc } of pages) {
    describe(url, () => {
      it("has lang, a unique-looking title, a description and one h1", () => {
        expect(doc.documentElement.getAttribute("lang")).toBe("sv");
        expect(doc.title.length).toBeGreaterThan(10);
        const desc = doc.querySelector('meta[name="description"]').getAttribute("content");
        expect(desc.length).toBeGreaterThan(40);
        expect(desc.length).toBeLessThanOrEqual(170);
        expect(doc.querySelectorAll("h1")).toHaveLength(1);
      });

      it("has a canonical URL on the production domain", () => {
        const canonical = doc.querySelector('link[rel="canonical"]').getAttribute("href");
        expect(canonical.startsWith(ORIGIN + "/")).toBe(true);
      });

      it("only links to pages and assets that exist", () => {
        const refs = [
          ...[...doc.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
          ...[...doc.querySelectorAll("img[src], script[src]")].map((e) => e.getAttribute("src")),
          ...[...doc.querySelectorAll("link[href]")].map((l) => l.getAttribute("href")),
          ...[...doc.querySelectorAll("source[srcset], img[srcset]")].flatMap((s) =>
            s
              .getAttribute("srcset")
              .split(",")
              .map((part) => part.trim().split(" ")[0]),
          ),
        ].filter((h) => h.startsWith("/") && !h.startsWith("//") && !h.startsWith("/api/"));
        for (const ref of refs) expect(existsInSite(ref), `${url} → ${ref}`).toBe(true);
      });

      it("gives every image an alt attribute and dimensions", () => {
        for (const img of doc.querySelectorAll("img")) {
          expect(img.hasAttribute("alt"), img.outerHTML).toBe(true);
          expect(img.getAttribute("width")).toBeTruthy();
          expect(img.getAttribute("height")).toBeTruthy();
        }
      });

      it("has valid JSON-LD", () => {
        for (const ld of jsonLd(doc)) expect(ld["@context"]).toBe("https://schema.org");
      });
    });
  }
});

describe("product pages", () => {
  for (const product of products) {
    it(`${product.slug} has product SEO`, () => {
      const page = byUrl(`/motiv/${product.slug}/`);
      expect(page, product.slug).toBeDefined();
      const { doc } = page;
      expect(doc.title).toBe(`${product.name} – 3D-printade örhängen 50 kr | Cutie Poppers`);
      expect(doc.querySelector('meta[property="og:type"]').getAttribute("content")).toBe("product");
      expect(doc.querySelector('meta[property="og:image"]').getAttribute("content")).toBe(
        `${ORIGIN}/og/${product.slug}.jpg`,
      );
      const ld = jsonLd(doc);
      const prod = ld.find((x) => x["@type"] === "Product");
      expect(prod.name).toBe(product.name);
      expect(prod.offers).toHaveLength(2);
      expect(prod.image.every((u) => u.startsWith(`${ORIGIN}/img/`))).toBe(true);
      expect(ld.find((x) => x["@type"] === "BreadcrumbList").itemListElement).toHaveLength(3);
      expect(doc.querySelector("h1").textContent.trim()).toBe(product.name);
      const crumbs = [...doc.querySelectorAll(".breadcrumbs li")].map((li) => li.textContent.trim());
      expect(crumbs[0]).toBe("Startsida");
      expect(crumbs.at(-1)).toBe(product.name);
    });
  }
});

describe("category pages", () => {
  for (const cat of categories) {
    it(`${cat.slug} lists its products`, () => {
      const { doc } = byUrl(`/kategori/${cat.slug}/`);
      const count = products.filter((p) => p.categories.includes(cat.slug)).length;
      expect(doc.querySelectorAll(".product-card")).toHaveLength(count);
      expect(doc.querySelector('.chip[aria-current="page"]').textContent.trim()).toBe(cat.name);
      expect(doc.querySelectorAll(".breadcrumbs li")).toHaveLength(2);
      expect(jsonLd(doc).find((x) => x["@type"] === "ItemList").numberOfItems).toBe(count);
    });
  }
});

describe("sitemap and robots", () => {
  const sitemap = fs.readFileSync(path.join(SITE, "sitemap.xml"), "utf8");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  it("lists exactly the indexable pages", () => {
    const indexable = pages.filter((p) => !isNoindex(p.doc)).map((p) => ORIGIN + p.url);
    expect([...locs].sort()).toEqual([...indexable].sort());
    expect(locs).toContain(`${ORIGIN}/motiv/krabba/`);
    expect(locs.some((l) => l.includes("404"))).toBe(false);
  });

  it("gives every URL a valid lastmod date", () => {
    const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    expect(lastmods).toHaveLength(locs.length);
    for (const d of lastmods) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("robots.txt points to the sitemap", () => {
    expect(fs.readFileSync(path.join(SITE, "robots.txt"), "utf8")).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });

  it("ships _headers and _redirects for Cloudflare", () => {
    expect(fs.readFileSync(path.join(SITE, "_headers"), "utf8")).toContain("immutable");
    expect(fs.existsSync(path.join(SITE, "_redirects"))).toBe(true);
  });

  it("has a 404 page marked noindex", () => {
    expect(isNoindex(byUrl("/404.html").doc)).toBe(true);
  });
});

describe("Google Merchant feed", () => {
  const feed = fs.readFileSync(path.join(SITE, "merchant-feed.xml"), "utf8");
  const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  const tag = (item, name) => item.match(new RegExp(`<g:${name}>([^<]*)</g:${name}>`))[1];

  it("has an earring and a keyring item per product", () => {
    expect(items).toHaveLength(products.length * 2);
    expect(new Set(items.map((i) => tag(i, "id"))).size).toBe(items.length);
  });

  it("has prices in SEK, absolute links and existing images", () => {
    for (const item of items) {
      expect(tag(item, "price")).toMatch(/^(50|30)\.00 SEK$/);
      expect(tag(item, "link")).toMatch(new RegExp(`^${ORIGIN}/motiv/[a-z0-9-]+/$`));
      const image = tag(item, "image_link");
      expect(existsInSite(new URL(image).pathname), image).toBe(true);
    }
  });
});
