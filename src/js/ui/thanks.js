import { formatKr } from "../lib/format.js";
import { SHOP } from "../lib/catalog.js";
import { safeStorage } from "../lib/storage.js";
import { LAST_ORDER_KEY } from "./checkout.js";

export function initThanks(root = document, session = safeStorage(() => window.sessionStorage)) {
  const page = root.querySelector("[data-thanks]");
  if (!page) return;
  let order;
  try {
    order = JSON.parse(session.getItem(LAST_ORDER_KEY));
  } catch {
    order = null;
  }
  if (!order || !order.orderNumber) return;

  page.querySelector("[data-thanks-number]").textContent = `#${order.orderNumber}`;
  const names = (order.items || []).map((i) => i.name).join(", ");
  page.querySelector("[data-thanks-items]").textContent = `${names} · ${formatKr(order.subtotalOre || 0)} + frakt`;
  page.querySelector("[data-thanks-order]").hidden = false;
  if (order.phone) {
    page.querySelector("[data-thanks-lead]").textContent =
      `Vi hör av oss ${SHOP.responseTime} med en Swish-förfrågan till ${order.phone}. Sedan printar vi dina varor och postar dem.`;
  }
}

/* c8 ignore next */
if (typeof document !== "undefined" && !globalThis.__CP_TEST__) initThanks();
