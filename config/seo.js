// Build-time SEO helpers: titles, descriptions and JSON-LD objects.
import { KINDS, SHOP } from "../src/js/lib/catalog.js";

const MAX_DESCRIPTION = 160;

export function truncate(text, max = MAX_DESCRIPTION) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export function pageTitle(title, site) {
  if (!title) return `${site.name} – ${site.tagline}`;
  return `${title} | ${site.name}`;
}

export function productTitle(product) {
  return `${product.name} – 3D-printade örhängen 50 kr`;
}

export function productDescription(product) {
  return truncate(`${product.name}: ${product.description} Örhängen 50 kr, nyckelring 30 kr. Välj bland 10 färger.`);
}

export function absoluteUrl(pathOrUrl, base) {
  return new URL(pathOrUrl, base).href;
}

export function organizationLd(site) {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": `${site.url}/#store`,
    name: site.name,
    url: `${site.url}/`,
    logo: `${site.url}/logo512.png`,
    email: site.email,
    description: site.description,
    address: { "@type": "PostalAddress", addressLocality: site.seller.city, addressCountry: "SE" },
    sameAs: [site.instagram.url, site.facebook.url],
  };
}

export function websiteLd(site) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.name,
    url: `${site.url}/`,
    inLanguage: "sv-SE",
    publisher: { "@id": `${site.url}/#store` },
  };
}

export function returnPolicyLd() {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "SE",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 14,
    returnMethod: "https://schema.org/ReturnByMail",
    // Köpvillkor: the customer pays return shipping (no fixed amount to declare).
    returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
  };
}

export function shippingDetailsLd() {
  const days = (minValue, maxValue) => ({ "@type": "QuantitativeValue", minValue, maxValue, unitCode: "DAY" });
  // Lowest PostNord letter postage; the exact amount is added to the Swish request.
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: (SHOP.shippingFromOre / 100).toFixed(2), currency: "SEK" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "SE" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      // SHOP.dispatch: printed and sent within 3–4 working days; PostNord then takes a few days.
      handlingTime: days(3, 4),
      transitTime: days(1, 4),
    },
  };
}

export function productLd(product, site, imageUrls) {
  const url = `${site.url}/motiv/${product.slug}/`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.description,
    sku: product.slug,
    url,
    image: imageUrls,
    brand: { "@type": "Brand", name: site.name },
    material: "PLA",
    category: "Smycken > Örhängen",
    offers: KINDS.map((kind) => ({
      "@type": "Offer",
      name: `${product.name} – ${kind.label}`,
      sku: `${product.slug}-${kind.id}`,
      url,
      price: (kind.priceOre / 100).toFixed(2),
      priceCurrency: "SEK",
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${site.url}/#store` },
      shippingDetails: shippingDetailsLd(),
      hasMerchantReturnPolicy: returnPolicyLd(),
    })),
  };
}

/** crumbs: [{ name, url }] with absolute or site-relative urls */
export function breadcrumbLd(crumbs, site) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.url, site.url),
    })),
  };
}

export function itemListLd(products, site, name) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${site.url}/motiv/${p.slug}/`,
      name: p.name,
    })),
  };
}

/** Serialise JSON-LD safely for embedding in <script type="application/ld+json">. */
export function jsonLdScript(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
