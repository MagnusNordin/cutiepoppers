import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const productSchema = {
  type: "array",
  minItems: 1,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["slug", "name", "categories", "sizeCm", "description", "images", "inStock", "order"],
    properties: {
      slug: { type: "string", pattern: "^[a-z0-9]+(-[a-z0-9]+)*$" },
      name: { type: "string", minLength: 1 },
      categories: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string" } },
      sizeCm: { type: "number", exclusiveMinimum: 0, maximum: 15 },
      description: { type: "string", minLength: 20, maxLength: 400 },
      images: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["src", "alt"],
          properties: {
            src: { type: "string", pattern: "^[a-z0-9-]+\\.(jpe?g|png|webp)$" },
            alt: { type: "string", minLength: 5 },
            // "contain" = line drawing: show whole and centred instead of cropping
            fit: { enum: ["contain"] },
          },
        },
      },
      inStock: { type: "boolean" },
      order: { type: "integer", minimum: 1 },
    },
  },
};

export const categorySchema = {
  type: "array",
  minItems: 1,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["slug", "name", "title", "intro"],
    properties: {
      slug: { type: "string", pattern: "^[a-z0-9]+(-[a-z0-9]+)*$" },
      name: { type: "string", minLength: 1 },
      title: { type: "string", minLength: 1 },
      intro: { type: "string", minLength: 20 },
    },
  },
};

const formatAjvErrors = (label, errors) => errors.map((e) => `${label}${e.instancePath || ""}: ${e.message}`);

/**
 * Validate catalogue data. Returns a list of human-readable errors (empty when valid).
 * `imageExists` is injectable so tests don't depend on the file system.
 */
export function validateData(products, categories, imageExists) {
  const ajv = new Ajv({ allErrors: true });
  const errors = [];
  if (!ajv.validate(productSchema, products)) errors.push(...formatAjvErrors("products", ajv.errors));
  if (!ajv.validate(categorySchema, categories)) errors.push(...formatAjvErrors("categories", ajv.errors));
  if (errors.length) return errors;

  const seen = new Set();
  for (const p of products) {
    if (seen.has(p.slug)) errors.push(`products: duplicate slug "${p.slug}"`);
    seen.add(p.slug);
  }
  const catSlugs = new Set(categories.map((c) => c.slug));
  if (catSlugs.size !== categories.length) errors.push("categories: duplicate slug");
  for (const p of products) {
    for (const c of p.categories) {
      if (!catSlugs.has(c)) errors.push(`products/${p.slug}: unknown category "${c}"`);
    }
    for (const img of p.images) {
      if (!imageExists(img.src)) errors.push(`products/${p.slug}: missing image "${img.src}"`);
    }
  }
  for (const c of categories) {
    if (!products.some((p) => p.categories.includes(c.slug))) errors.push(`categories/${c.slug}: has no products`);
  }
  return errors;
}

export function loadData(dir = root) {
  const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, "src/_data", f), "utf8"));
  return { products: read("products.json"), categories: read("categories.json") };
}

export const imageExistsOnDisk = (src) => fs.existsSync(path.join(root, "src/images/products", src));

/* c8 ignore start */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { products, categories } = loadData();
  const errors = validateData(products, categories, imageExistsOnDisk);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`Data OK: ${products.length} products, ${categories.length} categories`);
}
/* c8 ignore stop */
