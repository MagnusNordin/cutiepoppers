import { describe, expect, it } from "vitest";
import site from "../../src/_data/site.js";
import * as seo from "../../config/seo.js";

const product = {
  slug: "krabba",
  name: "Krabba",
  description: "En krabba som går sidledes rakt in i sommaren. För alla som har fiskat krabba från en brygga.",
  inStock: true,
};

describe("truncate", () => {
  it("leaves short text alone and collapses whitespace", () => {
    expect(seo.truncate("  hej   där ")).toBe("hej där");
  });

  it("cuts on a word boundary with an ellipsis", () => {
    const out = seo.truncate("ord ".repeat(60), 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("titles and descriptions", () => {
  it("builds page titles", () => {
    expect(seo.pageTitle("Kontakt", site)).toBe("Kontakt | Cutie Poppers");
    expect(seo.pageTitle(undefined, site)).toBe("Cutie Poppers – 3D-printade örhängen och nyckelringar");
  });

  it("builds product titles and descriptions within 160 characters", () => {
    expect(seo.productTitle(product)).toBe("Krabba – 3D-printade örhängen 50 kr");
    const d = seo.productDescription(product);
    expect(d.startsWith("Krabba: En krabba")).toBe(true);
    expect(d.length).toBeLessThanOrEqual(160);
  });

  it("makes absolute URLs", () => {
    expect(seo.absoluteUrl("/motiv/krabba/", site.url)).toBe("https://cutiepoppers.shop/motiv/krabba/");
  });
});

describe("JSON-LD", () => {
  it("describes the store and website", () => {
    const org = seo.organizationLd(site);
    expect(org["@type"]).toBe("OnlineStore");
    expect(org.sameAs).toContain(site.instagram.url);
    expect(org.address.addressLocality).toBe("Huddinge");
    expect(seo.websiteLd(site).publisher["@id"]).toBe(org["@id"]);
  });

  it("describes a product with one offer per kind in SEK", () => {
    const ld = seo.productLd(product, site, ["https://cutiepoppers.shop/img/a.jpeg"]);
    expect(ld["@type"]).toBe("Product");
    expect(ld.url).toBe("https://cutiepoppers.shop/motiv/krabba/");
    expect(ld.offers.map((o) => o.price)).toEqual(["50.00", "30.00"]);
    expect(ld.offers.every((o) => o.priceCurrency === "SEK")).toBe(true);
    expect(ld.offers[0].availability).toBe("https://schema.org/InStock");
    expect(ld.offers[0].hasMerchantReturnPolicy.merchantReturnDays).toBe(14);
    expect(ld).not.toHaveProperty("aggregateRating");
  });

  it("marks out-of-stock products", () => {
    const ld = seo.productLd({ ...product, inStock: false }, site, []);
    expect(ld.offers[0].availability).toBe("https://schema.org/OutOfStock");
  });

  it("builds breadcrumbs and item lists", () => {
    const bc = seo.breadcrumbLd(
      [
        { name: "Startsida", url: "/" },
        { name: "Krabba", url: "/motiv/krabba/" },
      ],
      site,
    );
    expect(bc.itemListElement[1]).toMatchObject({ position: 2, item: "https://cutiepoppers.shop/motiv/krabba/" });
    const list = seo.itemListLd([product], site, "Marint");
    expect(list.numberOfItems).toBe(1);
    expect(list.itemListElement[0].url).toBe("https://cutiepoppers.shop/motiv/krabba/");
  });

  it("escapes < so JSON-LD can't close its script tag", () => {
    expect(seo.jsonLdScript({ a: "</script>" })).toBe('{"a":"\\u003c/script>"}');
  });
});
