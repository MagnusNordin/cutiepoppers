// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { bindTrackedLinks, track } from "../../src/js/lib/analytics.js";

describe("track", () => {
  it("is a no-op without Umami", () => {
    expect(track("x", undefined, {})).toBe(false);
    expect(track("x", undefined, undefined)).toBe(false);
  });

  it("forwards events with and without props", () => {
    const umami = { track: vi.fn() };
    expect(track("add_to_cart", { motif: "krabba" }, { umami })).toBe(true);
    expect(umami.track).toHaveBeenCalledWith("add_to_cart", { motif: "krabba" });
    track("begin_checkout", undefined, { umami });
    expect(umami.track).toHaveBeenLastCalledWith("begin_checkout");
  });

  it("swallows errors from the analytics script", () => {
    const umami = {
      track: () => {
        throw new Error("blocked");
      },
    };
    expect(track("x", undefined, { umami })).toBe(false);
  });
});

describe("bindTrackedLinks", () => {
  it("tracks clicks on data-track elements with their data-track-* props", () => {
    document.body.innerHTML = `
      <a href="#" data-track="filter_category" data-track-category="marint"><span>Marint</span></a>
      <a href="#" data-track="outbound_instagram">IG</a>
      <p>other</p>`;
    const umami = { track: vi.fn() };
    bindTrackedLinks(document, { umami });
    document.querySelector("span").click();
    expect(umami.track).toHaveBeenCalledWith("filter_category", { category: "marint" });
    document.querySelectorAll("a")[1].click();
    expect(umami.track).toHaveBeenLastCalledWith("outbound_instagram");
    document.querySelector("p").click();
    expect(umami.track).toHaveBeenCalledTimes(2);
  });
});
