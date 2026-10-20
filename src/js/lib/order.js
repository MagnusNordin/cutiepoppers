import { findColor, findHook, findKind } from "./catalog.js";
import { formatKr } from "./format.js";
import { itemCount, lineTotal, subtotal } from "./pricing.js";

/** "Röd · guldkrok" for earrings, "Svart" for keyrings. */
export function describeOptions(item) {
  const color = findColor(item.color);
  const parts = [color ? color.name : item.color];
  if (item.hook) {
    const hook = findHook(item.hook);
    parts.push(hook ? hook.label : item.hook);
  }
  return parts.join(" · ");
}

/** "Örhängen" / "Nyckelring", with quantity when more than one. */
export function describeKind(item) {
  const kind = findKind(item.kind);
  const label = kind ? kind.label : item.kind;
  return item.qty > 1 ? `${label} × ${item.qty}` : label;
}

/** Plain-text order for pasting into an Instagram DM. */
export function formatOrderText(items) {
  const lines = items.map((i) => `• ${i.name} – ${describeKind(i)} – ${describeOptions(i)} – ${formatKr(lineTotal(i))}`);
  return [
    "Hej! Jag vill beställa:",
    ...lines,
    `Totalt: ${formatKr(subtotal(items))} + frakt (${itemCount(items)} st)`,
  ].join("\n");
}
