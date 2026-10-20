// @vitest-environment happy-dom
import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCart } from "../../src/js/lib/cart.js";
import { memoryStorage } from "../../src/js/lib/storage.js";
import { initCheckout, LAST_ORDER_KEY, readFields, showErrors } from "../../src/js/ui/checkout.js";
import { initThanks } from "../../src/js/ui/thanks.js";

const strip = (file) =>
  fs
    .readFileSync(file, "utf8")
    .replace(/^---[\s\S]*?---/, "")
    .replace(/{%-?[\s\S]*?-?%}/g, "")
    .replace(/{{[\s\S]*?}}/g, "x")
    .replace(/<script[\s\S]*?<\/script>/g, "");

// The field loop is Nunjucks, so build the inputs it would render.
const checkoutHtml = () =>
  strip("src/bestallning.njk").replace(
    '<form class="checkout-form" data-checkout-form action="/api/orders" method="post" novalidate>',
    `<form class="checkout-form" data-checkout-form novalidate>
      ${["name", "phone", "email", "street"]
        .map((f) => `<input id="${f}" name="${f}"><span data-error-for="${f}"></span>`)
        .join("")}
      <input type="hidden" name="cf-turnstile-response" value="tok">`,
  );

const item = { slug: "krabba", name: "Krabba", kind: "earring", color: "rod", hook: "guld" };
const good = {
  name: "Anna Andersson",
  phone: "070-123 45 67",
  email: "anna@example.se",
  street: "Storgatan 1",
  zip: "12345",
  city: "Huddinge",
  message: "",
};

function fill(values) {
  for (const [k, v] of Object.entries(values)) document.querySelector(`[name="${k}"]`).value = v;
}

const submit = () =>
  document.querySelector("[data-checkout-form]").dispatchEvent(new Event("submit", { cancelable: true }));

describe("checkout", () => {
  let cart, session, navigate;
  beforeEach(() => {
    document.body.innerHTML = checkoutHtml();
    cart = createCart(memoryStorage());
    session = memoryStorage();
    navigate = vi.fn();
  });

  const init = (fetch, extra = {}) => initCheckout(document, { cart, fetch, session, navigate, ...extra });

  it("shows the empty state without items", () => {
    init(vi.fn());
    expect(document.querySelector("[data-checkout-empty]").hidden).toBe(false);
    expect(document.querySelector("[data-checkout-form]").hidden).toBe(true);
  });

  it("summarises the cart", () => {
    cart.add({ ...item, qty: 2 });
    init(vi.fn());
    expect(document.querySelector("[data-checkout-count]").textContent).toBe("2 varor");
    expect(document.querySelector("[data-checkout-total]").textContent).toBe("100 kr + frakt");
  });

  it("shows field errors and focuses the first invalid field", () => {
    cart.add(item);
    const fetch = vi.fn();
    init(fetch);
    fill({ ...good, phone: "123", zip: "1" });
    submit();
    expect(document.querySelector('[data-error-for="phone"]').textContent).toContain("mobilnummer");
    expect(document.querySelector("#phone").getAttribute("aria-invalid")).toBe("true");
    expect(document.querySelector("#name").hasAttribute("aria-invalid")).toBe(false);
    expect(document.activeElement.id).toBe("phone");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("waits for the Turnstile token", async () => {
    cart.add(item);
    document.querySelector('[name="cf-turnstile-response"]').value = "";
    init(vi.fn());
    fill(good);
    submit();
    expect(document.querySelector("[data-checkout-error]").textContent).toContain("robot");
  });

  it("submits, stores the order, clears the cart and goes to the thank-you page", async () => {
    cart.add(item);
    const fetch = vi.fn(async () =>
      Response.json({ orderNumber: "CP-2610-ABCD", subtotalOre: 5000, items: [{ name: "Krabba" }] }),
    );
    init(fetch);
    fill(good);
    submit();
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/tack/"));
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("/api/orders");
    const sent = JSON.parse(opts.body);
    expect(sent.items).toEqual([{ slug: "krabba", kind: "earring", color: "rod", hook: "guld", qty: 1 }]);
    expect(sent.turnstileToken).toBe("tok");
    expect(sent.customer.email).toBe("anna@example.se");
    expect(JSON.parse(session.getItem(LAST_ORDER_KEY))).toMatchObject({
      orderNumber: "CP-2610-ABCD",
      phone: "070-123 45 67",
    });
    expect(cart.items()).toEqual([]);
  });

  it("shows server errors, field errors and resets Turnstile", async () => {
    cart.add(item);
    const turnstile = { reset: vi.fn() };
    const fetch = vi.fn(async () =>
      Response.json({ error: "Kolla de markerade fälten.", fields: { city: "Skriv ort." } }, { status: 422 }),
    );
    init(fetch, { turnstile });
    fill(good);
    submit();
    await vi.waitFor(() => expect(document.querySelector("[data-checkout-error]").hidden).toBe(false));
    expect(document.querySelector("[data-checkout-error]").textContent).toBe("Kolla de markerade fälten.");
    expect(document.querySelector('[data-error-for="city"]').textContent).toBe("Skriv ort.");
    expect(turnstile.reset).toHaveBeenCalled();
    expect(cart.items()).toHaveLength(1);
    expect(document.querySelector("[data-checkout-submit]").disabled).toBe(false);
  });

  it("handles network failures and non-JSON errors", async () => {
    cart.add(item);
    init(vi.fn(async () => new Response("bad gateway", { status: 502 })));
    fill(good);
    submit();
    await vi.waitFor(() =>
      expect(document.querySelector("[data-checkout-error]").textContent).toBe(
        "Beställningen kunde inte skickas. Försök igen.",
      ),
    );
  });

  it("refuses to submit an emptied cart", () => {
    cart.add(item);
    init(vi.fn());
    cart.clear();
    fill(good);
    submit();
    expect(document.querySelector("[data-checkout-error]").textContent).toBe("Varukorgen är tom.");
  });

  it("does nothing on other pages", () => {
    document.body.innerHTML = "";
    expect(() => initCheckout(document, { cart })).not.toThrow();
  });
});

describe("form helpers", () => {
  it("reads missing fields as empty and tolerates missing error slots", () => {
    document.body.innerHTML = `<form><input name="name" value="Anna"></form>`;
    const form = document.querySelector("form");
    expect(readFields(form)).toMatchObject({ name: "Anna", phone: "" });
    expect(() => showErrors(form, { phone: "x" })).not.toThrow();
  });
});

describe("thank-you page", () => {
  beforeEach(() => {
    document.body.innerHTML = strip("src/tack.njk");
  });

  it("shows the order number, items and phone", () => {
    const session = memoryStorage();
    session.setItem(
      LAST_ORDER_KEY,
      JSON.stringify({
        orderNumber: "CP-2610-ABCD",
        subtotalOre: 13000,
        items: [{ name: "Krabba" }, { name: "Kaffe" }],
        phone: "070-123 45 67",
      }),
    );
    initThanks(document, session);
    expect(document.querySelector("[data-thanks-number]").textContent).toBe("#CP-2610-ABCD");
    expect(document.querySelector("[data-thanks-items]").textContent).toBe("Krabba, Kaffe · 130 kr + frakt");
    expect(document.querySelector("[data-thanks-order]").hidden).toBe(false);
    expect(document.querySelector("[data-thanks-lead]").textContent).toContain("070-123 45 67");
  });

  it("handles orders without items or phone", () => {
    const session = memoryStorage();
    session.setItem(LAST_ORDER_KEY, JSON.stringify({ orderNumber: "CP-1" }));
    initThanks(document, session);
    expect(document.querySelector("[data-thanks-items]").textContent).toBe(" · 0 kr + frakt");
  });

  it("keeps the generic text without a stored order", () => {
    const session = memoryStorage();
    initThanks(document, session);
    expect(document.querySelector("[data-thanks-order]").hidden).toBe(true);
    session.setItem(LAST_ORDER_KEY, "{broken");
    initThanks(document, session);
    expect(document.querySelector("[data-thanks-order]").hidden).toBe(true);
  });

  it("does nothing on other pages", () => {
    document.body.innerHTML = "";
    expect(() => initThanks(document, memoryStorage())).not.toThrow();
  });
});
