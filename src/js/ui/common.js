import { bindTrackedLinks } from "../lib/analytics.js";
import { pluralItems } from "../lib/format.js";
import { getCart } from "./shared.js";

export function renderBadge(root, count) {
  const link = root.querySelector("[data-cart-link]");
  const badge = root.querySelector("[data-cart-count]");
  if (!link || !badge) return;
  badge.textContent = String(count);
  badge.hidden = count === 0;
  link.setAttribute("aria-label", count ? `Varukorg, ${pluralItems(count)}` : "Varukorg, tom");
}

export function initCartBadge(root = document, cart = getCart()) {
  const update = (items) =>
    renderBadge(
      root,
      items.reduce((n, i) => n + i.qty, 0),
    );
  update(cart.items());
  return cart.subscribe(update);
}

/* c8 ignore next 4 */
if (typeof document !== "undefined" && !globalThis.__CP_TEST__) {
  initCartBadge();
  bindTrackedLinks(document);
}
