import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { formatKr, formatSize, pluralMotifs } from "./src/js/lib/format.js";
import * as catalog from "./config/catalog.js";
import * as seo from "./config/seo.js";
import { largestJpegUrl, ogImage, productImageHtml } from "./config/images.js";

const FONTS = {
  "anton-400.woff2": "@fontsource/anton/files/anton-latin-400-normal.woff2",
  "dm-sans-400.woff2": "@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2",
  "dm-sans-500.woff2": "@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2",
  "dm-sans-700.woff2": "@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff2",
  "yellowtail-400.woff2": "@fontsource/yellowtail/files/yellowtail-latin-400-normal.woff2",
};

/** Short content hash of the CSS/JS/fonts, so their URLs can be cached forever. */
export function assetHash(dirs) {
  const hash = crypto.createHash("sha256");
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else hash.update(full).update(fs.readFileSync(full));
    }
  };
  dirs.forEach(walk);
  Object.values(FONTS).forEach((f) => hash.update(f));
  return hash.digest("hex").slice(0, 10);
}

export default function (eleventyConfig) {
  const version = assetHash(["src/css", "src/js"]);
  const assetBase = `/v/${version}`;
  eleventyConfig.addGlobalData("assetBase", assetBase);

  eleventyConfig.addPassthroughCopy({ "src/static": "/" });
  eleventyConfig.addPassthroughCopy({ "src/css": `${assetBase}/css` });
  eleventyConfig.addPassthroughCopy({ "src/js": `${assetBase}/js` });
  for (const [out, from] of Object.entries(FONTS)) {
    eleventyConfig.addPassthroughCopy({ [`node_modules/${from}`]: `${assetBase}/fonts/${out}` });
  }
  eleventyConfig.addWatchTarget("src/css/");
  eleventyConfig.addWatchTarget("src/js/");

  // Formatting
  eleventyConfig.addFilter("kr", formatKr);
  eleventyConfig.addFilter("size", formatSize);
  eleventyConfig.addFilter("motifs", pluralMotifs);
  eleventyConfig.addFilter("absoluteUrl", (p, base) => seo.absoluteUrl(p, base));
  eleventyConfig.addFilter("jsonLd", seo.jsonLdScript);
  eleventyConfig.addFilter("truncate", seo.truncate);

  // Catalogue
  eleventyConfig.addFilter("sortProducts", catalog.sortProducts);
  eleventyConfig.addFilter("inCategory", catalog.productsInCategory);
  eleventyConfig.addFilter("category", catalog.categoryBySlug);
  eleventyConfig.addFilter("related", catalog.relatedProducts);
  eleventyConfig.addFilter("tint", catalog.tintFor);
  eleventyConfig.addGlobalData("dots", () => catalog.colorDots());

  // SEO
  eleventyConfig.addFilter("pageTitle", seo.pageTitle);
  eleventyConfig.addFilter("productTitle", seo.productTitle);
  eleventyConfig.addFilter("productDescription", seo.productDescription);
  eleventyConfig.addFilter("organizationLd", seo.organizationLd);
  eleventyConfig.addFilter("websiteLd", seo.websiteLd);
  eleventyConfig.addFilter("breadcrumbLd", seo.breadcrumbLd);
  eleventyConfig.addFilter("itemListLd", seo.itemListLd);
  eleventyConfig.addAsyncFilter("productLd", async (product, site) => {
    const urls = await Promise.all(product.images.map((img) => largestJpegUrl(img.src)));
    return seo.productLd(
      product,
      site,
      urls.map((u) => seo.absoluteUrl(u, site.url)),
    );
  });

  // Images
  eleventyConfig.addAsyncShortcode("productImage", (file, alt, opts) => productImageHtml(file, alt, opts || {}));
  eleventyConfig.addAsyncShortcode("ogImage", (slug, file) => ogImage(slug, file));

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk", "md"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
