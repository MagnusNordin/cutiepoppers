import { track } from "../lib/analytics.js";
import { formatKr } from "../lib/format.js";
import { getCart } from "./shared.js";

/** Thumbnail buttons switch the main image (all sizes are already in the HTML). */
export function initGallery(root = document) {
  const gallery = root.querySelector("[data-gallery]");
  if (!gallery) return;
  const images = gallery.querySelectorAll("[data-gallery-image]");
  const thumbs = gallery.querySelectorAll("[data-gallery-thumb]");
  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const index = thumb.dataset.galleryThumb;
      images.forEach((img) => (img.hidden = img.dataset.galleryImage !== index));
      thumbs.forEach((t) => t.setAttribute("aria-current", String(t === thumb)));
    });
  });
}

/** Read the current choices from the options form. */
export function readSelection(form) {
  const value = (name) => {
    const checked = form.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : null;
  };
  const kind = value("kind");
  return {
    slug: form.dataset.slug,
    name: form.dataset.name,
    image: form.dataset.image,
    kind,
    color: value("color"),
    hook: kind === "earring" ? value("hook") : null,
    qty: 1,
  };
}

/** Update labels, price, hook visibility and image tint to match the choices. */
export function syncOptions(form, root = document) {
  const kindInput = form.querySelector('input[name="kind"]:checked');
  const colorInput = form.querySelector('input[name="color"]:checked');
  const hookInput = form.querySelector('input[name="hook"]:checked');
  const isEarring = kindInput && kindInput.value === "earring";

  const hookGroup = form.querySelector("[data-hook-group]");
  if (hookGroup) hookGroup.hidden = !isEarring;
  const price = form.querySelector("[data-price-label]");
  if (price && kindInput) price.textContent = formatKr(Number(kindInput.dataset.price));
  const colorName = form.querySelector("[data-color-name]");
  if (colorName && colorInput) colorName.textContent = colorInput.dataset.name;
  const hookName = form.querySelector("[data-hook-name]");
  if (hookName && hookInput) hookName.textContent = hookInput.dataset.name;
  const main = root.querySelector("[data-gallery-main]");
  if (main && colorInput) main.style.setProperty("--tint", colorInput.dataset.pale);
}

export function initProductForm(root = document, cart = getCart()) {
  const form = root.querySelector("[data-product-form]");
  if (!form) return;
  const status = form.querySelector("[data-added-status]");
  syncOptions(form, root);

  form.addEventListener("change", (e) => {
    syncOptions(form, root);
    const name = e.target && e.target.name;
    if (name === "kind" || name === "color" || name === "hook") {
      track(`select_${name}`, { motif: form.dataset.slug, value: e.target.value });
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const item = readSelection(form);
    try {
      cart.add(item);
    } catch (err) {
      status.textContent = err.message;
      return;
    }
    status.innerHTML = 'Tillagd i varukorgen! <a href="/varukorg/">Till varukorgen</a>';
    track("add_to_cart", { motif: item.slug, kind: item.kind, color: item.color, hook: item.hook || "-" });
  });
}

/* c8 ignore next 4 */
if (typeof document !== "undefined" && !globalThis.__CP_TEST__) {
  initGallery();
  initProductForm();
}
