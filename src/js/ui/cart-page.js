import { track } from "../lib/analytics.js";
import { lineKey } from "../lib/cart.js";
import { findColor } from "../lib/catalog.js";
import { formatKr, pluralItems } from "../lib/format.js";
import { describeKind, describeOptions, formatOrderText } from "../lib/order.js";
import { itemCount, lineTotal, subtotal } from "../lib/pricing.js";
import { getCart } from "./shared.js";

function renderLine(template, item, cart) {
  const li = template.content.firstElementChild.cloneNode(true);
  const key = lineKey(item);
  const q = (sel) => li.querySelector(sel);
  const img = q("[data-line-image]");
  if (item.image) img.src = item.image;
  else img.remove();
  const name = q("[data-line-name]");
  name.textContent = item.name;
  name.href = `/motiv/${item.slug}/`;
  q("[data-line-kind]").textContent = describeKind(item);
  q("[data-line-options]").textContent = describeOptions(item);
  const color = findColor(item.color);
  q("[data-line-dot]").style.setProperty("--dot", color ? color.hex : "transparent");
  q("[data-line-price]").textContent = formatKr(lineTotal(item));
  q("[data-line-qty]").textContent = String(item.qty);
  q("[data-line-dec]").setAttribute("aria-label", `Ta bort en ${item.name}`);
  q("[data-line-inc]").setAttribute("aria-label", `Lägg till en ${item.name}`);
  q("[data-line-remove]").setAttribute("aria-label", `Ta bort ${item.name}`);
  q("[data-line-dec]").addEventListener("click", () => cart.setQty(key, item.qty - 1));
  q("[data-line-inc]").addEventListener("click", () => cart.setQty(key, item.qty + 1));
  q("[data-line-remove]").addEventListener("click", () => {
    cart.remove(key);
    track("remove_from_cart", { motif: item.slug });
  });
  return li;
}

export function renderCart(root, items, cart) {
  const page = root.querySelector("[data-cart-page]");
  const filled = page.querySelector("[data-cart-filled]");
  const empty = page.querySelector("[data-cart-empty]");
  const list = page.querySelector("[data-cart-lines]");
  const template = root.querySelector("[data-cart-line-template]");
  const count = itemCount(items);

  empty.hidden = items.length > 0;
  filled.hidden = items.length === 0;
  page.querySelector("[data-cart-meta]").textContent = count ? pluralItems(count) : "";
  list.replaceChildren(...items.map((item) => renderLine(template, item, cart)));
  page.querySelector("[data-cart-subtotal]").textContent = formatKr(subtotal(items));
  page.querySelector("[data-cart-total]").textContent = `${formatKr(subtotal(items))} + frakt`;
}

/** Copy text to the clipboard; falls back to selecting a textarea for old/in-app browsers. */
export async function copyText(text, fallbackEl, nav = globalThis.navigator, doc = globalThis.document) {
  try {
    await nav.clipboard.writeText(text);
    return true;
  } catch {
    if (!fallbackEl) return false;
    fallbackEl.value = text;
    fallbackEl.select();
    try {
      return doc.execCommand("copy");
    } catch {
      return false;
    }
  }
}

export function initCartPage(root = document, cart = getCart(), opts = {}) {
  const page = root.querySelector("[data-cart-page]");
  if (!page) return;
  const { open = (url) => window.open(url, "_blank", "noopener"), copy = copyText } = opts;
  const config = JSON.parse(root.querySelector("[data-instagram-config]").textContent);

  renderCart(root, cart.items(), cart);
  cart.subscribe((items) => renderCart(root, items, cart));

  const status = page.querySelector("[data-instagram-status]");
  page.querySelector("[data-instagram-order]").addEventListener("click", async () => {
    const items = cart.items();
    const ok = await copy(formatOrderText(items), page.querySelector("[data-instagram-fallback]"));
    status.textContent = ok
      ? "Beställningen är kopierad! Klistra in den i DM:et till oss."
      : "Kunde inte kopiera automatiskt. Skriv vilka motiv, färger och krokar du vill ha i DM:et.";
    track("instagram_order_copied", { items: itemCount(items), ok: String(ok) });
    open(config.dm);
  });
}

/* c8 ignore next */
if (typeof document !== "undefined" && !globalThis.__CP_TEST__) initCartPage();
