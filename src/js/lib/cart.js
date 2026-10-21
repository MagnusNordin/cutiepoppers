import { findColor, findHook, findKind, MAX_LINES, MAX_QTY_PER_LINE } from "./catalog.js";

export const CART_KEY = "cp:cart";
const VERSION = 1;

/** Identity of a cart line: same motif + kind + colour + hook merge into one line. */
export function lineKey(item) {
  return [item.slug, item.kind, item.color, item.kind === "earring" ? item.hook : "-"].join("|");
}

/** Normalise and validate a line. Returns null for anything we can't sell. */
export function normaliseItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const kind = findKind(raw.kind);
  const color = findColor(raw.color);
  if (!kind || !color || typeof raw.slug !== "string" || !raw.slug) return null;
  const hook = kind.hasHook ? findHook(raw.hook) : null;
  if (kind.hasHook && !hook) return null;
  const qty = Math.min(MAX_QTY_PER_LINE, Math.max(1, Math.floor(Number(raw.qty) || 1)));
  return {
    slug: raw.slug,
    name: String(raw.name || raw.slug),
    image: typeof raw.image === "string" ? raw.image : "",
    kind: kind.id,
    color: color.id,
    hook: hook ? hook.id : null,
    qty,
  };
}

export function serialize(items) {
  return JSON.stringify({ v: VERSION, items });
}

export function deserialize(text) {
  try {
    const data = JSON.parse(text);
    if (!data || data.v !== VERSION || !Array.isArray(data.items)) return [];
    return data.items.map(normaliseItem).filter(Boolean).slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

/**
 * Cart backed by a Storage-like object. Every mutation persists and notifies
 * subscribers. Reads always go to storage so other tabs' changes are seen.
 */
export function createCart(storage, key = CART_KEY) {
  const listeners = new Set();

  const read = () => deserialize(storage.getItem(key));
  const write = (items) => {
    if (items.length) storage.setItem(key, serialize(items));
    else storage.removeItem(key);
    listeners.forEach((fn) => fn(items));
    return items;
  };

  return {
    items: read,
    count: () => read().reduce((n, i) => n + i.qty, 0),
    add(raw) {
      const item = normaliseItem(raw);
      if (!item) throw new Error("Ogiltig vara");
      const items = read();
      const existing = items.find((i) => lineKey(i) === lineKey(item));
      if (existing) existing.qty = Math.min(MAX_QTY_PER_LINE, existing.qty + item.qty);
      else if (items.length >= MAX_LINES) throw new Error("Varukorgen är full");
      else items.push(item);
      return write(items);
    },
    remove(keyToRemove) {
      return write(read().filter((i) => lineKey(i) !== keyToRemove));
    },
    setQty(keyToSet, qty) {
      const n = Math.floor(Number(qty));
      if (!(n >= 1)) return this.remove(keyToSet);
      return write(read().map((i) => (lineKey(i) === keyToSet ? { ...i, qty: Math.min(MAX_QTY_PER_LINE, n) } : i)));
    },
    clear: () => write([]),
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Call when storage changed elsewhere (e.g. the window "storage" event). */
    refresh() {
      const items = read();
      listeners.forEach((fn) => fn(items));
      return items;
    },
  };
}
