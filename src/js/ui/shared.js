import { CART_KEY, createCart } from "../lib/cart.js";
import { safeStorage } from "../lib/storage.js";

let cart;

/** The page-wide cart, persisted in localStorage and synced across tabs. */
export function getCart(win = window) {
  if (cart) return cart;
  cart = createCart(safeStorage(() => win.localStorage));
  win.addEventListener("storage", (e) => {
    if (e.key === CART_KEY || e.key === null) cart.refresh();
  });
  return cart;
}

/** For tests: forget the singleton. */
export function resetCart() {
  cart = undefined;
}
