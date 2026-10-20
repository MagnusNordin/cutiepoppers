// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { createCart } from "../../src/js/lib/cart.js";
import { memoryStorage } from "../../src/js/lib/storage.js";
import { initCartBadge, renderBadge } from "../../src/js/ui/cart-badge.js";
import { initGridMore } from "../../src/js/ui/grid-more.js";
import { getCart, resetCart } from "../../src/js/ui/shared.js";

const item = { slug: "krabba", name: "Krabba", kind: "earring", color: "rod", hook: "silver" };

describe("cart badge", () => {
  beforeEach(() => {
    document.body.innerHTML = `<a data-cart-link href="/varukorg/"><span data-cart-count hidden>0</span></a>`;
  });

  it("hides the count when empty and labels the link", () => {
    renderBadge(document, 0);
    expect(document.querySelector("[data-cart-count]").hidden).toBe(true);
    expect(document.querySelector("[data-cart-link]").getAttribute("aria-label")).toBe("Varukorg, tom");
  });

  it("shows the total quantity and updates on changes", () => {
    const cart = createCart(memoryStorage());
    cart.add(item);
    initCartBadge(document, cart);
    const badge = document.querySelector("[data-cart-count]");
    expect(badge.textContent).toBe("1");
    expect(badge.hidden).toBe(false);
    cart.add({ ...item, qty: 2 });
    expect(badge.textContent).toBe("3");
    expect(document.querySelector("[data-cart-link]").getAttribute("aria-label")).toBe("Varukorg, 3 varor");
  });

  it("does nothing without badge markup", () => {
    document.body.innerHTML = "";
    expect(() => renderBadge(document, 2)).not.toThrow();
  });
});

describe("shared cart", () => {
  beforeEach(() => {
    resetCart();
    localStorage.clear();
  });

  it("is a localStorage-backed singleton that reacts to storage events", () => {
    const cart = getCart(window);
    expect(getCart(window)).toBe(cart);
    let seen = null;
    cart.subscribe((items) => (seen = items));
    localStorage.setItem("cp:cart", JSON.stringify({ v: 1, items: [item] }));
    window.dispatchEvent(new StorageEvent("storage", { key: "cp:cart" }));
    expect(seen).toHaveLength(1);
    seen = null;
    window.dispatchEvent(new StorageEvent("storage", { key: "other" }));
    expect(seen).toBeNull();
  });
});

describe("grid more", () => {
  const markup = (extra = true) => `
    <ul data-grid><li><a href="/a/">A</a></li>${extra ? '<li data-grid-extra><a href="/b/">B</a></li>' : ""}</ul>
    <button data-grid-more hidden>Visa alla</button>`;

  it("collapses the grid and reveals everything on click", () => {
    document.body.innerHTML = markup();
    initGridMore(document);
    const grid = document.querySelector("[data-grid]");
    const button = document.querySelector("[data-grid-more]");
    expect(grid.classList.contains("is-collapsed")).toBe(true);
    expect(button.hidden).toBe(false);
    button.click();
    expect(grid.classList.contains("is-collapsed")).toBe(false);
    expect(button.hidden).toBe(true);
    expect(document.activeElement.getAttribute("href")).toBe("/b/");
  });

  it("leaves short grids alone", () => {
    document.body.innerHTML = markup(false);
    initGridMore(document);
    expect(document.querySelector("[data-grid-more]").hidden).toBe(true);
  });

  it("ignores pages without a grid", () => {
    document.body.innerHTML = "";
    expect(() => initGridMore(document)).not.toThrow();
  });
});
