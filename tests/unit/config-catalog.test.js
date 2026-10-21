import { describe, expect, it } from "vitest";
import {
  categoryBySlug,
  colorDots,
  productsInCategory,
  relatedProducts,
  sortProducts,
  tintFor,
} from "../../config/catalog.js";

const p = (slug, order, categories) => ({ slug, order, categories });
const products = [p("c", 3, ["marint"]), p("a", 1, ["sport"]), p("b", 2, ["marint", "djur"]), p("d", 4, ["sport"])];

describe("build catalogue helpers", () => {
  it("sorts by order without mutating", () => {
    expect(sortProducts(products).map((x) => x.slug)).toEqual(["a", "b", "c", "d"]);
    expect(products[0].slug).toBe("c");
  });

  it("filters by category; 'alla' and empty mean everything", () => {
    expect(productsInCategory(products, "marint").map((x) => x.slug)).toEqual(["b", "c"]);
    expect(productsInCategory(products, "alla")).toHaveLength(4);
    expect(productsInCategory(products, undefined)).toHaveLength(4);
  });

  it("finds categories by slug", () => {
    expect(categoryBySlug([{ slug: "x" }], "x")).toEqual({ slug: "x" });
  });

  it("puts same-category products first and excludes the product itself", () => {
    expect(relatedProducts(products[0], products, 3).map((x) => x.slug)).toEqual(["b", "a", "d"]);
    expect(relatedProducts(products[1], products).map((x) => x.slug)).toEqual(["d", "b", "c"]);
  });

  it("returns five colour dots and the remaining count", () => {
    const { dots, more } = colorDots();
    expect(dots).toHaveLength(5);
    expect(more).toBe(5);
    expect(colorDots(2).dots).toHaveLength(2);
  });

  it("cycles tints", () => {
    expect(tintFor(0)).toBe(tintFor(8));
    expect(tintFor(1)).not.toBe(tintFor(0));
  });
});
