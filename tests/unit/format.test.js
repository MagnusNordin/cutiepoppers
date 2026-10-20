import { describe, expect, it } from "vitest";
import { formatKr, formatSize, pluralItems, pluralMotifs, slugify } from "../../src/js/lib/format.js";

const NBSP = " ";

describe("formatKr", () => {
  it("formats whole kronor without decimals", () => {
    expect(formatKr(5000)).toBe(`50${NBSP}kr`);
    expect(formatKr(0)).toBe(`0${NBSP}kr`);
  });

  it("groups thousands with non-breaking spaces", () => {
    expect(formatKr(123400)).toBe(`1${NBSP}234${NBSP}kr`);
  });

  it("shows two decimals for öre amounts", () => {
    expect(formatKr(4950)).toBe(`49,50${NBSP}kr`);
  });
});

describe("formatSize", () => {
  it("uses a Swedish decimal comma", () => {
    expect(formatSize(4)).toBe("ca 4 cm");
    expect(formatSize(4.5)).toBe("ca 4,5 cm");
  });
});

describe("plurals", () => {
  it("pluralises items", () => {
    expect(pluralItems(1)).toBe("1 vara");
    expect(pluralItems(3)).toBe("3 varor");
  });

  it("keeps motiv in plural", () => {
    expect(pluralMotifs(1)).toBe("1 motiv");
    expect(pluralMotifs(36)).toBe("36 motiv");
  });
});

describe("slugify", () => {
  it("transliterates Swedish letters", () => {
    expect(slugify("Övertänkare")).toBe("overtankare");
    expect(slugify("Hjo-hjärta")).toBe("hjo-hjarta");
    expect(slugify("Segelbåt")).toBe("segelbat");
  });

  it("collapses spaces and symbols", () => {
    expect(slugify("  Ingen marionett! ")).toBe("ingen-marionett");
    expect(slugify("Café & Crème")).toBe("cafe-creme");
  });
});
