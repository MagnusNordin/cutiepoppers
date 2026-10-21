import { track } from "../lib/analytics.js";
import { formatKr, pluralItems } from "../lib/format.js";
import { itemCount, subtotal } from "../lib/pricing.js";
import { safeStorage } from "../lib/storage.js";
import { FIELDS, validateCheckout } from "../lib/validate.js";
import { getCart } from "./shared.js";

export const LAST_ORDER_KEY = "cp:lastOrder";

export function showErrors(form, errors) {
  for (const field of FIELDS) {
    const input = form.elements[field];
    const slot = form.querySelector(`[data-error-for="${field}"]`);
    const message = errors[field] || "";
    if (slot) slot.textContent = message;
    if (input) {
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }
  const first = FIELDS.find((f) => errors[f]);
  if (first && form.elements[first]) form.elements[first].focus();
}

export function readFields(form) {
  const data = {};
  for (const field of FIELDS) data[field] = form.elements[field] ? form.elements[field].value : "";
  return data;
}

function renderSummary(root, items) {
  root.querySelector("[data-checkout-count]").textContent = pluralItems(itemCount(items));
  root.querySelector("[data-checkout-total]").textContent = `${formatKr(subtotal(items))} + frakt`;
}

/**
 * deps: { cart, fetch, session (Storage-like), navigate(url), turnstile }
 */
export function initCheckout(root = document, deps = {}) {
  const page = root.querySelector("[data-checkout]");
  if (!page) return;
  const cart = deps.cart || getCart();
  const fetchFn = deps.fetch || ((...a) => fetch(...a));
  const session = deps.session || safeStorage(() => window.sessionStorage);
  const navigate = deps.navigate || ((url) => window.location.assign(url));
  const turnstile = () => deps.turnstile || window.turnstile;

  const form = page.querySelector("[data-checkout-form]");
  const empty = page.querySelector("[data-checkout-empty]");
  const alert = page.querySelector("[data-checkout-error]");
  const submit = page.querySelector("[data-checkout-submit]");

  const update = (items) => {
    empty.hidden = items.length > 0;
    form.hidden = items.length === 0;
    renderSummary(page, items);
  };
  update(cart.items());
  cart.subscribe(update);
  track("begin_checkout", { items: itemCount(cart.items()) });

  const fail = (message) => {
    alert.textContent = message;
    alert.hidden = false;
    alert.focus();
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alert.hidden = true;
    const fields = readFields(form);
    const { errors } = validateCheckout(fields);
    showErrors(form, errors);
    if (Object.keys(errors).length) return;

    const items = cart.items();
    if (!items.length) return fail("Varukorgen är tom.");
    const tokenInput = form.elements["cf-turnstile-response"];
    const token = tokenInput ? tokenInput.value : "";
    if (!token)
      return fail("Vänta ett ögonblick — vi kontrollerar att du inte är en robot. Försök igen om några sekunder.");

    submit.disabled = true;
    submit.textContent = "Skickar…";
    try {
      const res = await fetchFn("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer: fields,
          items: items.map(({ slug, kind, color, hook, qty }) => ({ slug, kind, color, hook, qty })),
          turnstileToken: token,
          website: form.elements.website ? form.elements.website.value : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields) showErrors(form, data.fields);
        throw new Error(data.error || "Beställningen kunde inte skickas. Försök igen.");
      }
      session.setItem(
        LAST_ORDER_KEY,
        JSON.stringify({ ...data, phone: validateCheckout(fields).values.phone, email: fields.email }),
      );
      track("order_submitted", { items: itemCount(items), value: subtotal(items) / 100 });
      cart.clear();
      navigate("/tack/");
    } catch (err) {
      track("order_failed", { reason: err.message.slice(0, 60) });
      const ts = turnstile();
      if (ts && typeof ts.reset === "function") ts.reset();
      fail(err.message || "Beställningen kunde inte skickas. Försök igen.");
    } finally {
      submit.disabled = false;
      submit.textContent = "Skicka beställning";
    }
  });
}

/* c8 ignore next */
if (typeof document !== "undefined" && !globalThis.__CP_TEST__) initCheckout();
