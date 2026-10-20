// @vitest-environment happy-dom
import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCart, lineKey } from "../../src/js/lib/cart.js";
import { memoryStorage } from "../../src/js/lib/storage.js";
import { copyText, initCartPage } from "../../src/js/ui/cart-page.js";

// Use the real template markup (front matter stripped, Nunjucks vars filled in).
const source = fs
  .readFileSync("src/varukorg.njk", "utf8")
  .replace(/^---[\s\S]*?---/, "")
  .replace(/{{ site\.instagram\.dm }}/g, "https://ig.me/m/cutie.poppers");

const earring = { slug: "krabba", name: "Krabba", kind: "earring", color: "rod", hook: "guld", image: "/img/k.jpeg" };
const keyring = { slug: "kaffe", name: "Kaffe", kind: "keyring", color: "svart" };

describe("cart page", () => {
  let cart;
  beforeEach(() => {
    document.body.innerHTML = source;
    cart = createCart(memoryStorage());
  });

  const $ = (sel) => document.querySelector(sel);
  const lines = () => [...document.querySelectorAll("[data-cart-lines] .cart-line")];

  it("shows the empty state", () => {
    initCartPage(document, cart);
    expect($("[data-cart-empty]").hidden).toBe(false);
    expect($("[data-cart-filled]").hidden).toBe(true);
    expect($("[data-cart-meta]").textContent).toBe("");
  });

  it("renders lines, totals and links", () => {
    cart.add(earring);
    cart.add({ ...keyring, qty: 2 });
    initCartPage(document, cart);
    expect(lines()).toHaveLength(2);
    const first = lines()[0];
    expect(first.querySelector("[data-line-name]").getAttribute("href")).toBe("/motiv/krabba/");
    expect(first.querySelector("[data-line-options]").textContent).toBe("Röd · guldkrok");
    expect(first.querySelector("[data-line-image]").getAttribute("src")).toBe("/img/k.jpeg");
    expect(lines()[1].querySelector("[data-line-image]")).toBeNull();
    expect(lines()[1].querySelector("[data-line-kind]").textContent).toBe("Nyckelring × 2");
    expect($("[data-cart-subtotal]").textContent).toBe("110 kr");
    expect($("[data-cart-total]").textContent).toBe("110 kr + frakt");
    expect($("[data-cart-meta]").textContent).toBe("3 varor");
  });

  it("changes quantities and removes lines", () => {
    cart.add(earring);
    initCartPage(document, cart);
    lines()[0].querySelector("[data-line-inc]").click();
    expect(cart.count()).toBe(2);
    expect(lines()[0].querySelector("[data-line-qty]").textContent).toBe("2");
    lines()[0].querySelector("[data-line-dec]").click();
    expect(cart.count()).toBe(1);
    lines()[0].querySelector("[data-line-remove]").click();
    expect(cart.items()).toEqual([]);
    expect($("[data-cart-empty]").hidden).toBe(false);
  });

  it("removes a line when decreasing from one", () => {
    cart.add(earring);
    initCartPage(document, cart);
    lines()[0].querySelector("[data-line-dec]").click();
    expect(cart.items()).toEqual([]);
  });

  it("labels the icon buttons", () => {
    cart.add(earring);
    initCartPage(document, cart);
    expect(lines()[0].querySelector("[data-line-remove]").getAttribute("aria-label")).toBe("Ta bort Krabba");
  });

  it("copies the order and opens Instagram", async () => {
    cart.add(earring);
    const copy = vi.fn(async () => true);
    const open = vi.fn();
    initCartPage(document, cart, { copy, open });
    $("[data-instagram-order]").click();
    await vi.waitFor(() => expect(open).toHaveBeenCalledWith("https://ig.me/m/cutie.poppers"));
    expect(copy.mock.calls[0][0]).toContain("• Krabba – Örhängen – Röd · guldkrok – 50 kr");
    expect($("[data-instagram-status]").textContent).toContain("kopierad");
  });

  it("explains when copying fails", async () => {
    cart.add(earring);
    const open = vi.fn();
    initCartPage(document, cart, { copy: async () => false, open });
    $("[data-instagram-order]").click();
    await vi.waitFor(() => expect(open).toHaveBeenCalled());
    expect($("[data-instagram-status]").textContent).toContain("Kunde inte kopiera");
  });

  it("re-renders when another tab changes the cart", () => {
    initCartPage(document, cart);
    const storage = memoryStorage();
    const shared = createCart(storage);
    initCartPage(document, shared);
    createCart(storage).add(earring);
    shared.refresh();
    expect(lines()).toHaveLength(1);
    expect(lineKey(shared.items()[0])).toBe(lineKey(earring));
  });

  it("does nothing on other pages", () => {
    document.body.innerHTML = "";
    expect(() => initCartPage(document, cart)).not.toThrow();
  });
});

describe("copyText", () => {
  it("uses the async clipboard API", async () => {
    const nav = { clipboard: { writeText: vi.fn(async () => {}) } };
    expect(await copyText("hej", null, nav)).toBe(true);
    expect(nav.clipboard.writeText).toHaveBeenCalledWith("hej");
  });

  it("falls back to execCommand with a textarea", async () => {
    const textarea = document.createElement("textarea");
    const doc = { execCommand: vi.fn(() => true) };
    expect(await copyText("hej", textarea, {}, doc)).toBe(true);
    expect(textarea.value).toBe("hej");
  });

  it("returns false when nothing works", async () => {
    expect(await copyText("hej", null, {})).toBe(false);
    const doc = {
      execCommand: () => {
        throw new Error("nope");
      },
    };
    expect(await copyText("hej", document.createElement("textarea"), {}, doc)).toBe(false);
  });
});
