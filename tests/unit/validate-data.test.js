import { describe, expect, it } from "vitest";
import { imageExistsOnDisk, loadData, validateData } from "../../scripts/validate-data.js";

const product = (over = {}) => ({
  slug: "krabba",
  name: "Krabba",
  categories: ["marint"],
  sizeCm: 5,
  description: "En krabba som går sidledes rakt in i sommaren.",
  images: [{ src: "crab-red.jpg", alt: "Krabba i rött" }],
  inStock: true,
  order: 1,
  ...over,
});
const category = (over = {}) => ({
  slug: "marint",
  name: "Marint",
  title: "Marina örhängen",
  intro: "Krabbor, hummer och fyrar för havsälskare.",
  ...over,
});
const always = () => true;

describe("validateData", () => {
  it("accepts valid data", () => {
    expect(validateData([product()], [category()], always)).toEqual([]);
  });

  it("reports schema errors", () => {
    const errors = validateData([product({ slug: "Bad Slug", sizeCm: -1 })], [category({ intro: "" })], always);
    expect(errors.join("\n")).toMatch(/products\/0\/slug/);
    expect(errors.join("\n")).toMatch(/products\/0\/sizeCm/);
    expect(errors.join("\n")).toMatch(/categories\/0\/intro/);
  });

  it("reports duplicate slugs", () => {
    expect(validateData([product(), product({ order: 2 })], [category()], always)).toContain(
      'products: duplicate slug "krabba"',
    );
    expect(validateData([product()], [category(), category()], always)).toContain("categories: duplicate slug");
  });

  it("reports unknown categories, missing images and empty categories", () => {
    const errors = validateData([product({ categories: ["rymden"] })], [category()], (src) => src !== "crab-red.jpg");
    expect(errors).toContain('products/krabba: unknown category "rymden"');
    expect(errors).toContain('products/krabba: missing image "crab-red.jpg"');
    expect(errors).toContain("categories/marint: has no products");
  });
});

describe("the real catalogue", () => {
  it("is valid", () => {
    const { products, categories } = loadData();
    expect(validateData(products, categories, imageExistsOnDisk)).toEqual([]);
  });

  it("has all 36 motifs, each in at least one category", () => {
    const { products, categories } = loadData();
    expect(products).toHaveLength(36);
    expect(categories.map((c) => c.slug)).toEqual(["statement", "marint", "sport", "djur", "vardag", "souvenir"]);
    expect(products.find((p) => p.slug === "badhytt").categories).toEqual(["souvenir"]);
  });
});
