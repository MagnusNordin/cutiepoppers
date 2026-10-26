// Shared catalogue facts used by the build, the browser and the order Worker.
// Prices are integers in öre.

export const KINDS = [
  { id: "earring", label: "Örhängen", short: "Örhängen", priceOre: 5000, unit: "par", hasHook: true },
  { id: "keyring", label: "Nyckelring", short: "Nyckelring", priceOre: 3000, unit: "st", hasHook: false },
];

export const COLORS = [
  { id: "svart", name: "Svart", hex: "#1A1A1A", pale: "#E4DEE6" },
  { id: "gra", name: "Grå", hex: "#9A9A9A", pale: "#ECEAEC" },
  { id: "vit", name: "Vit", hex: "#FFFFFF", pale: "#FFF8FD" },
  { id: "gul", name: "Gul", hex: "#F5C800", pale: "#FBF0B8" },
  { id: "orange", name: "Orange", hex: "#F27A1A", pale: "#FAD9BC" },
  { id: "rod", name: "Röd", hex: "#D7262B", pale: "#F9C9CC" },
  { id: "rosa", name: "Rosa", hex: "#F59AC9", pale: "#FCE1EF" },
  { id: "lila", name: "Lila", hex: "#8E44C4", pale: "#E6D6F2" },
  { id: "bla", name: "Blå", hex: "#2453D6", pale: "#DCE1F7" },
  { id: "gron", name: "Grön", hex: "#2E9E4F", pale: "#D4EEDB" },
];

export const HOOKS = [
  { id: "silver", name: "Silver", label: "silverkrok" },
  { id: "guld", name: "Guld", label: "guldkrok" },
];

export const DEFAULTS = { kind: "earring", color: "rod", hook: "silver" };

/** Customer-facing promises, used on the site and in order e-mails. */
export const SHOP = { responseTime: "inom 1–2 dagar", dispatch: "3–4 arbetsdagar", shippingFromOre: 2200 };

export const MAX_QTY_PER_LINE = 20;
export const MAX_LINES = 30;

export function findKind(id) {
  return KINDS.find((k) => k.id === id);
}

export function findColor(id) {
  return COLORS.find((c) => c.id === id);
}

export function findHook(id) {
  return HOOKS.find((h) => h.id === id);
}
