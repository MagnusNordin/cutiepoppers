import { findKind } from "./catalog.js";

/** Unit price in öre for a kind ("earring" | "keyring"). Throws for unknown kinds. */
export function priceFor(kindId) {
  const kind = findKind(kindId);
  if (!kind) throw new Error(`Okänd produkttyp: ${kindId}`);
  return kind.priceOre;
}

export function lineTotal(item) {
  return priceFor(item.kind) * item.qty;
}

/** Sum of all lines in öre. Shipping is added later by hand (weighed per order). */
export function subtotal(items) {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

export function itemCount(items) {
  return items.reduce((n, item) => n + item.qty, 0);
}
