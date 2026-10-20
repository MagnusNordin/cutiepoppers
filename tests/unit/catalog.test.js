import { describe, expect, it } from "vitest";
import { COLORS, DEFAULTS, findColor, findHook, findKind, HOOKS, KINDS } from "../../src/js/lib/catalog.js";

describe("catalog", () => {
  it("has the two kinds with their prices in öre", () => {
    expect(findKind("earring")).toMatchObject({ priceOre: 5000, hasHook: true });
    expect(findKind("keyring")).toMatchObject({ priceOre: 3000, hasHook: false });
    expect(KINDS).toHaveLength(2);
  });

  it("has ten colours with unique ids and valid hex values", () => {
    expect(COLORS).toHaveLength(10);
    expect(new Set(COLORS.map((c) => c.id)).size).toBe(10);
    for (const c of COLORS) {
      expect(c.hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(c.pale).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("has silver and gold hooks", () => {
    expect(HOOKS.map((h) => h.id)).toEqual(["silver", "guld"]);
    expect(findHook("guld").label).toBe("guldkrok");
  });

  it("returns undefined for unknown ids", () => {
    expect(findKind("ring")).toBeUndefined();
    expect(findColor("magenta")).toBeUndefined();
    expect(findHook("koppar")).toBeUndefined();
  });

  it("has defaults that exist", () => {
    expect(findKind(DEFAULTS.kind)).toBeDefined();
    expect(findColor(DEFAULTS.color)).toBeDefined();
    expect(findHook(DEFAULTS.hook)).toBeDefined();
  });
});
