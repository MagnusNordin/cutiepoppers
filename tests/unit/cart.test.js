import { beforeEach, describe, expect, it, vi } from "vitest";
import { CART_KEY, createCart, deserialize, lineKey, normaliseItem, serialize } from "../../src/js/lib/cart.js";
import { memoryStorage } from "../../src/js/lib/storage.js";

const earring = { slug: "krabba", name: "Krabba", kind: "earring", color: "rod", hook: "guld", image: "/img/k.jpeg" };
const keyring = { slug: "kaffe", name: "Kaffe", kind: "keyring", color: "svart" };

describe("normaliseItem", () => {
  it("accepts a valid earring and defaults qty to 1", () => {
    expect(normaliseItem(earring)).toEqual({ ...earring, qty: 1 });
  });

  it("drops the hook for keyrings", () => {
    expect(normaliseItem({ ...keyring, hook: "guld" })).toMatchObject({ hook: null, image: "" });
  });

  it("rejects unknown kind, colour, missing slug or missing earring hook", () => {
    expect(normaliseItem(null)).toBeNull();
    expect(normaliseItem("x")).toBeNull();
    expect(normaliseItem({ ...earring, kind: "ring" })).toBeNull();
    expect(normaliseItem({ ...earring, color: "magenta" })).toBeNull();
    expect(normaliseItem({ ...earring, slug: "" })).toBeNull();
    expect(normaliseItem({ ...earring, hook: undefined })).toBeNull();
  });

  it("clamps qty between 1 and 20 and uses the slug when the name is missing", () => {
    expect(normaliseItem({ ...earring, qty: 99 }).qty).toBe(20);
    expect(normaliseItem({ ...earring, qty: -3 }).qty).toBe(1);
    expect(normaliseItem({ ...earring, qty: "abc" }).qty).toBe(1);
    expect(normaliseItem({ ...earring, name: undefined }).name).toBe("krabba");
  });
});

describe("lineKey", () => {
  it("ignores the hook for keyrings", () => {
    expect(lineKey({ ...keyring, hook: "guld" })).toBe(lineKey({ ...keyring, hook: "silver" }));
    expect(lineKey(earring)).not.toBe(lineKey({ ...earring, hook: "silver" }));
  });
});

describe("serialize / deserialize", () => {
  it("round-trips items", () => {
    const items = [normaliseItem(earring)];
    expect(deserialize(serialize(items))).toEqual(items);
  });

  it("returns an empty cart for garbage, wrong versions and missing data", () => {
    expect(deserialize(null)).toEqual([]);
    expect(deserialize("{not json")).toEqual([]);
    expect(deserialize(JSON.stringify({ v: 99, items: [] }))).toEqual([]);
    expect(deserialize(JSON.stringify({ v: 1 }))).toEqual([]);
  });

  it("filters out invalid lines", () => {
    const text = JSON.stringify({ v: 1, items: [earring, { slug: "x", kind: "nope" }] });
    expect(deserialize(text)).toHaveLength(1);
  });
});

describe("createCart", () => {
  let storage;
  let cart;
  beforeEach(() => {
    storage = memoryStorage();
    cart = createCart(storage);
  });

  it("starts empty", () => {
    expect(cart.items()).toEqual([]);
    expect(cart.count()).toBe(0);
  });

  it("adds items and persists them", () => {
    cart.add(earring);
    cart.add(keyring);
    expect(cart.count()).toBe(2);
    expect(JSON.parse(storage.getItem(CART_KEY)).items).toHaveLength(2);
  });

  it("merges identical lines", () => {
    cart.add(earring);
    cart.add({ ...earring, qty: 2 });
    expect(cart.items()).toHaveLength(1);
    expect(cart.count()).toBe(3);
  });

  it("caps merged quantity", () => {
    cart.add({ ...earring, qty: 15 });
    cart.add({ ...earring, qty: 15 });
    expect(cart.count()).toBe(20);
  });

  it("throws on invalid items", () => {
    expect(() => cart.add({ slug: "x" })).toThrow("Ogiltig vara");
  });

  it("refuses more than 30 different lines", () => {
    for (let i = 0; i < 30; i++) cart.add({ ...earring, slug: `m${i}` });
    expect(() => cart.add({ ...earring, slug: "one-too-many" })).toThrow("Varukorgen är full");
  });

  it("removes lines and clears storage when empty", () => {
    cart.add(earring);
    cart.remove(lineKey(earring));
    expect(cart.items()).toEqual([]);
    expect(storage.getItem(CART_KEY)).toBeNull();
  });

  it("sets quantities and removes on zero", () => {
    cart.add(earring);
    cart.setQty(lineKey(earring), 4);
    expect(cart.count()).toBe(4);
    cart.setQty(lineKey(earring), 50);
    expect(cart.count()).toBe(20);
    cart.setQty(lineKey(earring), 0);
    expect(cart.items()).toEqual([]);
  });

  it("only changes the targeted line", () => {
    cart.add(earring);
    cart.add(keyring);
    cart.setQty(lineKey(keyring), 3);
    expect(cart.items().map((i) => i.qty)).toEqual([1, 3]);
  });

  it("clears everything", () => {
    cart.add(earring);
    cart.clear();
    expect(cart.count()).toBe(0);
  });

  it("notifies subscribers and supports unsubscribe", () => {
    const fn = vi.fn();
    const off = cart.subscribe(fn);
    cart.add(earring);
    expect(fn).toHaveBeenLastCalledWith([expect.objectContaining({ slug: "krabba" })]);
    off();
    cart.clear();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("refresh re-reads storage changed elsewhere", () => {
    const fn = vi.fn();
    cart.subscribe(fn);
    createCart(storage).add(keyring);
    expect(cart.refresh()).toHaveLength(1);
    expect(fn).toHaveBeenCalledWith([expect.objectContaining({ slug: "kaffe" })]);
  });
});
