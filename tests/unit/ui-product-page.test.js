// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCart } from "../../src/js/lib/cart.js";
import { memoryStorage } from "../../src/js/lib/storage.js";
import { initGallery, initProductForm, readSelection, syncOptions } from "../../src/js/ui/product-page.js";

const radio = (name, value, attrs = "", checked = false) =>
  `<input type="radio" name="${name}" value="${value}" ${attrs}${checked ? " checked" : ""}>`;

function render() {
  document.body.innerHTML = `
    <div data-gallery>
      <div data-gallery-main>
        <div data-gallery-image="0">A</div><div data-gallery-image="1" hidden>B</div>
      </div>
      <button data-gallery-thumb="0" aria-current="true"></button>
      <button data-gallery-thumb="1"></button>
    </div>
    <form data-product-form data-slug="krabba" data-name="Krabba" data-image="/img/k-320.jpeg">
      ${radio("kind", "earring", 'data-price="5000"', true)}${radio("kind", "keyring", 'data-price="3000"')}
      <span data-color-name></span>
      ${radio("color", "rod", 'data-name="Röd" data-pale="#F9C9CC"', true)}${radio("color", "bla", 'data-name="Blå" data-pale="#DCE1F7"')}
      <fieldset data-hook-group><span data-hook-name></span>
        ${radio("hook", "silver", 'data-name="Silver"', true)}${radio("hook", "guld", 'data-name="Guld"')}
      </fieldset>
      <button type="submit">Lägg i varukorgen · <span data-price></span></button>
      <p data-added-status></p>
    </form>`;
  return document.querySelector("form");
}

const choose = (name, value) => {
  const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
  input.checked = true;
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

describe("gallery", () => {
  beforeEach(render);

  it("switches the main image and marks the current thumbnail", () => {
    initGallery(document);
    document.querySelector('[data-gallery-thumb="1"]').click();
    expect(document.querySelector('[data-gallery-image="0"]').hidden).toBe(true);
    expect(document.querySelector('[data-gallery-image="1"]').hidden).toBe(false);
    expect(document.querySelector('[data-gallery-thumb="1"]').getAttribute("aria-current")).toBe("true");
    expect(document.querySelector('[data-gallery-thumb="0"]').getAttribute("aria-current")).toBe("false");
  });

  it("ignores pages without a gallery", () => {
    document.body.innerHTML = "";
    expect(() => initGallery(document)).not.toThrow();
  });
});

describe("product options", () => {
  let form;
  beforeEach(() => {
    form = render();
  });

  it("reads the current selection", () => {
    expect(readSelection(form)).toEqual({
      slug: "krabba",
      name: "Krabba",
      image: "/img/k-320.jpeg",
      kind: "earring",
      color: "rod",
      hook: "silver",
      qty: 1,
    });
  });

  it("drops the hook for keyrings", () => {
    form.querySelector('[value="keyring"]').checked = true;
    expect(readSelection(form).hook).toBeNull();
  });

  it("returns null for missing choices", () => {
    form.querySelectorAll("input").forEach((i) => (i.checked = false));
    expect(readSelection(form)).toMatchObject({ kind: null, color: null, hook: null });
  });

  it("syncs price, names, tint and hook visibility", () => {
    syncOptions(form, document);
    expect(form.querySelector("[data-price]").textContent).toBe("50 kr");
    expect(form.querySelector("[data-color-name]").textContent).toBe("Röd");
    expect(form.querySelector("[data-hook-name]").textContent).toBe("Silver");
    expect(document.querySelector("[data-gallery-main]").style.getPropertyValue("--tint")).toBe("#F9C9CC");
  });

  it("tolerates a form without optional parts", () => {
    document.body.innerHTML = `<form data-product-form></form>`;
    expect(() => syncOptions(document.querySelector("form"), document)).not.toThrow();
  });

  it("updates on change and tracks selections", () => {
    const umami = { track: vi.fn() };
    window.umami = umami;
    initProductForm(document, createCart(memoryStorage()));
    choose("kind", "keyring");
    expect(form.querySelector("[data-hook-group]").hidden).toBe(true);
    expect(form.querySelector("[data-price]").textContent).toBe("30 kr");
    choose("color", "bla");
    expect(form.querySelector("[data-color-name]").textContent).toBe("Blå");
    expect(umami.track).toHaveBeenCalledWith("select_color", { motif: "krabba", value: "bla" });
    form.dispatchEvent(new Event("change", { bubbles: true }));
    expect(umami.track).toHaveBeenCalledTimes(2);
    delete window.umami;
  });

  it("adds the selection to the cart and announces it", () => {
    const cart = createCart(memoryStorage());
    initProductForm(document, cart);
    choose("hook", "guld");
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(cart.items()).toEqual([expect.objectContaining({ slug: "krabba", hook: "guld", qty: 1 })]);
    expect(form.querySelector("[data-added-status]").textContent).toContain("Tillagd i varukorgen");
  });

  it("shows cart errors", () => {
    const cart = {
      add: () => {
        throw new Error("Varukorgen är full");
      },
    };
    initProductForm(document, cart);
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(form.querySelector("[data-added-status]").textContent).toBe("Varukorgen är full");
  });

  it("does nothing on pages without the form", () => {
    document.body.innerHTML = "";
    expect(() => initProductForm(document, createCart(memoryStorage()))).not.toThrow();
  });
});
