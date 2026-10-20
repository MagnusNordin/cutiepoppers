import { describe, expect, it } from "vitest";
import { memoryStorage, safeStorage } from "../../src/js/lib/storage.js";

describe("memoryStorage", () => {
  it("stores strings and returns null for missing keys", () => {
    const s = memoryStorage();
    expect(s.getItem("a")).toBeNull();
    s.setItem("a", 1);
    expect(s.getItem("a")).toBe("1");
    s.removeItem("a");
    expect(s.getItem("a")).toBeNull();
  });
});

describe("safeStorage", () => {
  it("uses the real storage when it works", () => {
    const real = memoryStorage();
    const s = safeStorage(() => real);
    s.setItem("k", "v");
    expect(real.getItem("k")).toBe("v");
    expect(s.getItem("k")).toBe("v");
    s.removeItem("k");
    expect(real.getItem("k")).toBeNull();
  });

  it("falls back to memory when the getter throws", () => {
    const s = safeStorage(() => {
      throw new Error("SecurityError");
    });
    s.setItem("k", "v");
    expect(s.getItem("k")).toBe("v");
  });

  it("falls back to memory when writing fails up front", () => {
    const s = safeStorage(() => ({
      setItem() {
        throw new Error("QuotaExceeded");
      },
    }));
    s.setItem("k", "v");
    expect(s.getItem("k")).toBe("v");
  });

  it("survives storage that starts failing later", () => {
    let broken = false;
    const real = memoryStorage();
    const flaky = {
      getItem: (k) => {
        if (broken) throw new Error("x");
        return real.getItem(k);
      },
      setItem: (k, v) => {
        if (broken) throw new Error("x");
        real.setItem(k, v);
      },
      removeItem: (k) => {
        if (broken) throw new Error("x");
        real.removeItem(k);
      },
    };
    const s = safeStorage(() => flaky);
    broken = true;
    s.setItem("k", "v");
    expect(s.getItem("k")).toBe("v");
    s.removeItem("k");
    expect(s.getItem("k")).toBeNull();
  });
});
