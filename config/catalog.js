// Build-time catalogue helpers used by templates.
import { COLORS } from "../src/js/lib/catalog.js";

export function sortProducts(products) {
  return [...products].sort((a, b) => a.order - b.order);
}

export function productsInCategory(products, categorySlug) {
  if (!categorySlug || categorySlug === "alla") return sortProducts(products);
  return sortProducts(products.filter((p) => p.categories.includes(categorySlug)));
}

export function categoryBySlug(categories, slug) {
  return categories.find((c) => c.slug === slug);
}

/** Other products sharing the first category, then fill up with the rest. */
export function relatedProducts(product, products, count = 4) {
  const others = sortProducts(products).filter((p) => p.slug !== product.slug);
  const primary = product.categories[0];
  const same = others.filter((p) => p.categories.includes(primary));
  const rest = others.filter((p) => !p.categories.includes(primary));
  return [...same, ...rest].slice(0, count);
}

/** The five colour dots shown on product cards, plus how many more exist. */
export function colorDots(count = 5) {
  const ids = ["rod", "svart", "rosa", "bla", "gul"];
  const dots = ids.map((id) => COLORS.find((c) => c.id === id)).slice(0, count);
  return { dots, more: COLORS.length - dots.length };
}

/** Pastel tint for a card, cycling through the colour palette. */
export function tintFor(index) {
  const tints = ["#F9C9CC", "#E4DEE6", "#FDEEFA", "#FCE1EF", "#DCE1F7", "#FBF0B8", "#D4EEDB", "#E6D6F2"];
  return tints[index % tints.length];
}
