import { COLORS, HOOKS, KINDS, SHOP } from "../js/lib/catalog.js";

const env = process.env.ELEVENTY_ENV || "development";

// Public keys only. Secrets live in the Worker (wrangler secret put).
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export default {
  env,
  isProduction: env === "production",
  url: "https://cutiepoppers.shop",
  name: "Cutie Poppers",
  lang: "sv",
  locale: "sv_SE",
  tagline: "3D-printade örhängen och nyckelringar",
  description:
    "Lätta 3D-printade örhängen och nyckelringar med personlighet. Välj motiv, färg och silver- eller guldkrok. Nickelfritt och handgjort i Sverige. Örhängen 50 kr.",
  seller: { name: "Magnus Nordin", city: "Huddinge", country: "Sverige" },
  email: "hej@cutiepoppers.shop",
  instagram: {
    handle: "cutie.poppers",
    url: "https://www.instagram.com/cutie.poppers/",
    dm: "https://ig.me/m/cutie.poppers",
  },
  facebook: { url: "https://www.facebook.com/people/Cutie-poppers/61575606763052/" },
  dispatch: SHOP.dispatch,
  responseTime: SHOP.responseTime,
  shippingNote: "Frakten beräknas efter beställning",
  kinds: KINDS,
  colors: COLORS,
  hooks: HOOKS,
  turnstileSiteKey: env === "production" ? "0x4AAAAAAFdZ10KkbtEhgqGz" : TURNSTILE_TEST_SITE_KEY,
  umami: {
    websiteId: "062b22dc-c6b5-488c-9980-3bd3b0fea8df",
    src: "https://cloud.umami.is/script.js",
    domains: "cutiepoppers.shop",
  },
  gridInitial: 12,
  buildTime: new Date().toISOString(),
};
