import { describe, expect, it } from "vitest";
import { describeKind, describeOptions, formatOrderText } from "../../src/js/lib/order.js";
import { itemCount, lineTotal, priceFor, subtotal } from "../../src/js/lib/pricing.js";

const earring = { slug: "krabba", name: "Krabba", kind: "earring", color: "rod", hook: "guld", qty: 2 };
const keyring = { slug: "kaffe", name: "Kaffe", kind: "keyring", color: "svart", hook: null, qty: 1 };

describe("pricing", () => {
  it("prices kinds in öre", () => {
    expect(priceFor("earring")).toBe(5000);
    expect(priceFor("keyring")).toBe(3000);
    expect(() => priceFor("ring")).toThrow("Okänd produkttyp");
  });

  it("totals lines and carts", () => {
    expect(lineTotal(earring)).toBe(10000);
    expect(subtotal([earring, keyring])).toBe(13000);
    expect(subtotal([])).toBe(0);
    expect(itemCount([earring, keyring])).toBe(3);
  });
});

describe("order text", () => {
  it("describes options and kinds in Swedish", () => {
    expect(describeOptions(earring)).toBe("Röd · guldkrok");
    expect(describeOptions(keyring)).toBe("Svart");
    expect(describeKind(earring)).toBe("Örhängen × 2");
    expect(describeKind(keyring)).toBe("Nyckelring");
  });

  it("falls back to raw ids for unknown values", () => {
    expect(describeOptions({ color: "x", hook: "y" })).toBe("x · y");
    expect(describeKind({ kind: "z", qty: 1 })).toBe("z");
  });

  it("formats an Instagram-ready order", () => {
    expect(formatOrderText([earring, keyring])).toBe(
      [
        "Hej! Jag vill beställa:",
        "• Krabba – Örhängen × 2 – Röd · guldkrok – 100 kr",
        "• Kaffe – Nyckelring – Svart – 30 kr",
        "Totalt: 130 kr + frakt (3 st)",
      ].join("\n"),
    );
  });
});
