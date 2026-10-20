# Cutie Poppers redesign — implementation plan

Source design: Claude design canvas **"Cutie Poppers redesign"** (5 mobile artboards, 390 px wide):
`1 · Startsida`, `2 · Produkt`, `3 · Varukorg`, `4 · Beställning`, `5 · Tack!`.

Goals:

1. Replace the Create React App + MUI site with **static HTML + small vanilla JS modules** (no React, no framework runtime).
2. Implement the new features shown in the design (cart, product configurator, order form, collections, filters).
3. **Unit tests for all code** + **end-to-end tests** for the main user flows, run in CI.
4. **Best-practice SEO** (one crawlable URL per product, structured data, sitemap, fast pages).
5. **Privacy-friendly analytics** with funnel events.

---

## 1. Where we are today

| Area | Current state | Problem |
|---|---|---|
| Stack | CRA 5 (deprecated) + React 19 + MUI 7 + Emotion | Heavy JS bundle, CRA unmaintained, nothing rendered without JS |
| Pages | One page, products in a modal | Products have no URLs → Google can only index one page |
| HTML | Empty `<div id="root">`, `<noscript>` | Crawlers/social previews see no content; meta description talks about "treats and sweets" |
| Data | `public/products.json`, 36 products, fetched at runtime | Mixed id formats (`1` vs `EARRING-HEART`), 12 products have empty category, fake `rating` field |
| Images | `public/products/` = **155 MB**, JPEG/PNG + 300 px `-thumb` via `generate-thumbs.js` | No AVIF/WebP, no `srcset`, no width/height (CLS) |
| Ordering | "Contact us on Instagram/Facebook" | No cart, no structured order |
| Tests | One CRA placeholder test | — |
| Deploy | `gh-pages -d build` to GitHub Pages, `CNAME` = cutiepoppers.shop | Manual, no CI |

## 2. What the design adds

| # | Feature | Screen | Notes |
|---|---|---|---|
| F1 | New visual identity: pink `#F8D7F2`, ink `#141014`, blue accent `#2433D9`; Anton / DM Sans / Yellowtail; hard offset shadows | all | Fonts self-hosted (see §6) |
| F2 | Hero with price badges, "Shoppa nu", trust row (nickelfria krokar · 10 färger · guld eller silver) | Startsida | |
| F3 | **Category filter chips** "Hitta din vibe" (Alla, Statement, Marint, Sport, Djur, Vardag, Souvenir; the design said Västkust, renamed to Marint, and Souvenir was added) + count text | Startsida | Needs new category model (§4) |
| F4 | Product grid with colour dots "+5 färger" and "Visa alla 36 motiv" | Startsida | Progressive: all products are in the HTML, button just reveals |
| F5 | "Din färg. Din krok." colour + hook explainer (10 swatches, silver/guld) | Startsida | |
| F6 | **Collection carousel** (Marint, "Se alla 8") | Startsida | Horizontal scroll-snap, no JS needed |
| ~~F7~~ | ~~"Hej från oss!" about block~~ | Startsida | **Dropped** (D5) |
| F8 | Footer: Instagram + Facebook, Frakt & leverans, Så beställer du, Kontakt, Köpvillkor, Integritetspolicy, "Betala med Swish" | all | New static content pages |
| F9 | **Product page** per motif: gallery + thumbs, size, **type picker** (Örhängen 50 kr / Nyckelring 30 kr), **colour picker** (10), **hook picker** (only for earrings), facts, sticky "Lägg i varukorgen · {pris}" | Produkt | Replaces modal |
| F10 | **Cart** with badge count in header, line items (motif, type, colour, hook, price), remove, subtotal, "Frakt: beräknas efter beställning", "Totalt: X kr + frakt" | Varukorg | `localStorage`, no account |
| F11 | **"Beställ via Instagram istället"**: copies a formatted order text to clipboard and opens Instagram | Varukorg | |
| F12 | **Order form**: how-it-works steps, name, mobile (Swish), e-mail, street, postcode, city, message | Beställning | Needs a submit endpoint (§5.4, decision D1) |
| F13 | **Thank-you page** with order number and summary | Tack! | |

The design's placeholders are now filled in, apart from photos (see D5 in §10).

The design is **mobile only**. Desktop layout must be derived: max-width container (~1200 px), grid 2 → 3 → 4 columns, product page as two columns (gallery | options), cart/checkout as a centred column ≤ 640 px.

## 3. Architecture

### 3.1 Choice: Eleventy (11ty) v3 + vanilla ES modules

- **Eleventy** turns `products.json` + Nunjucks templates into plain `.html` files at build time. Zero client runtime, very small, widely used, easy to keep for years.
- **Vanilla JS**, written as small ES modules with pure logic separated from DOM wiring (easy to unit test). Shipped unbundled or with a tiny `esbuild` step for minification. Target: **< 15 kB JS gzipped** total.
- **Plain CSS** with custom properties for the design tokens, one stylesheet (`@layer` reset / tokens / components / utilities). No Tailwind/MUI.
- Every page works without JS (product info, prices, navigation); JS enhances: pickers, cart, filter, form submit.

Alternatives considered: Astro (also fine, but more machinery than needed), hand-rolled Node build script (less to learn, but we'd rebuild what Eleventy gives us: layouts, pagination, image plugin, dev server).

### 3.2 URL structure (Swedish, ASCII slugs)

```
/                              Startsida
/motiv/<slug>/                 Product page, e.g. /motiv/overtankare/, /motiv/hjo-hjarta/
/kategori/<slug>/              Category page, e.g. /kategori/marint/ (filter chips link here)
/varukorg/                     Cart            (noindex)
/bestallning/                  Checkout        (noindex)
/tack/                         Thank you       (noindex)
/frakt-och-leverans/  /sa-bestaller-du/  /kontakt/  /kopvillkor/  /integritetspolicy/
/404.html  /sitemap.xml  /robots.txt
```

Filter chips are real `<a href="/kategori/…/">` links (crawlable, shareable); JS intercepts them on the start page to filter in place and update the URL with `history.pushState`.

### 3.3 Repository layout

```
src/
  _data/            products.json, categories.json, site.js (name, url, prices, colours, hooks)
  _includes/        layouts (base.njk), partials (header, footer, product-card, seo-head, jsonld)
  pages/            index.njk, motiv.njk (paginated over products), kategori.njk, varukorg.njk, ...
  assets/
    css/main.css
    js/
      lib/          pure logic: cart.js, pricing.js, order.js, filter.js, slug.js, format.js, analytics.js
      ui/           DOM wiring: cart-badge.js, product-options.js, cart-page.js, checkout.js, filter-chips.js, gallery.js
    fonts/          self-hosted woff2
    images/         product photos (originals, outside the published output)
eleventy.config.js  filters, shortcodes (image), collections — also unit tested
scripts/            validate-data.js, import-csv.js (if products_export_1.csv stays the source)
tests/
  unit/             Vitest
  build/            Vitest: builds the site and inspects the generated HTML
  e2e/              Playwright
worker/             Cloudflare Worker: serves _site as static assets + /api/orders
wrangler.jsonc      Worker config (assets dir, routes, vars)
_headers, _redirects  in src/, copied to _site: cache, security headers, redirects
```

The React code (`src/*.tsx`, `src/components`) and CRA dependencies are deleted at the end of phase 1.

## 4. Data model & migration

New `products.json` entry (validated by a JSON schema in `scripts/validate-data.js`, run in CI and as a unit test):

```json
{
  "id": "overtankare",
  "slug": "overtankare",
  "name": "Övertänkare",
  "categories": ["statement"],
  "collections": [],
  "sizeCm": 5,
  "kinds": ["earring", "keyring"],
  "colors": "all",
  "description": "…",
  "images": [
    { "src": "overtankare-ear.jpg", "alt": "Övertänkare-örhängen i rött på en modell" }
  ],
  "inStock": true,
  "featured": false,
  "addedAt": "2025-11-11"
}
```

- `sizeCm` is per product, taken from today's descriptions (mostly 5 cm, some 3–4.5). The page shows "ca N cm". *Owner said "generally ca 4 cm" while the data says mostly 5 cm, so re-measure a few before launch.*
- Prices, colours (10, with hex + pale tint from the design) and hook types live once in `site.js`, not per product (today every product repeats 50/30).
- Drop the fake `rating` field (we must not publish ratings that aren't real reviews — also a Google structured-data policy issue).
- Stable, slug-based ids; keep a redirect/alias map only if old ids are referenced anywhere (they aren't — the old site has no product URLs).
- **Category mapping, decided (D3).** A product can be in several chips. "Alla" shows all 36. Chip order: Alla, Statement, Marint, Sport, Djur, Vardag, Souvenir.

| Chip (slug) | Products | Count |
|---|---|---|
| Statement (`statement`) | Övertänkare, Språkpolis, Ingen marionett, Kvinnosymbol, Fred, Leopard, Treenighet, Hjärta | 8 |
| Marint (`marint`) | Krabba, Hummer, Kräfta, Bläckfisk, Manet, Fyr, Ankare, Segelbåt | 8 |
| Sport (`sport`) | Fotbollsspelare, Fotboll, Gymnastik, Morgonsimmare, Innebandy, Handbollsskytt, Basketboll, Basketboll ifylld, Basketbollkorg, Basketbollsskytt, Basketbollsdribblare | 11 |
| Djur (`djur`) | Katt, Häst, Leopard, Krabba, Hummer, Kräfta, Bläckfisk, Manet | 8 |
| Vardag (`vardag`) | Kaffe, Hörlurar, Mus (computer mouse), Sax, Motorcykel | 5 |
| Souvenir (`souvenir`) | Badhytt (the Hjo bathing hut), Hjo-hjärta | 2 |

The Souvenir chip and category page get a short intro about Hjo, which is good for local search ("souvenir från Hjo", "Hjo badhytt"). Badhytt's description should say it's the Hjo hut. The home-page collection carousel (F6) shows **Marint**. Categories live in `categories.json` (slug, name, intro text, order), so renaming or adding one later is a data change.

## 5. Feature implementation

### 5.1 Layout, tokens, components (F1, F2, F5, F8)
- Design tokens as CSS custom properties copied from the artboards (colours, radii 14/16/18/24 px, `box-shadow: 4px 4px 0 #141014`, 2 px ink borders).
- Components: header (logo wordmark as SVG/HTML, cart badge), pill, button (primary/outline), product card, swatch, chip, info card, footer.
- Accessibility from the design notes: ≥ 44 px targets, real `<button>`/`<a>`, `aria-label` on icon buttons, contrast ≥ 4.5:1 (check `#4A3647` on `#F8D7F2` — passes), visible focus rings, `prefers-reduced-motion`.

### 5.2 Catalogue: grid, filter, collections (F3, F4, F6)
- All products rendered server-side in the grid; first N (e.g. 12) visible, "Visa alla 36 motiv" reveals the rest (`hidden` attribute; without JS all are shown).
- `lib/filter.js`: `filterProducts(products, categorySlug)`, `countLabel(category, n)` — pure, unit tested.
- Collection carousel: CSS `overflow-x: auto; scroll-snap-type: x mandatory`, keyboard-scrollable, no JS.

### 5.3 Product page & cart (F9, F10, F11)
- `lib/pricing.js`: `priceFor(kind)`, `lineTotal`, `subtotal`, all as integers in öre to avoid float bugs. **Shipping isn't calculated on the site** (D5). The owner weighs the parcel and adds the PostNord rate to the Swish request. So the cart and checkout show "Frakt: beräknas efter beställning" and "Totalt: X kr + frakt", and the order e-mail to the owner has a reminder line to add shipping. A fixed or calculated rate can be added later in `pricing.js` without touching the UI.
- `lib/cart.js`: `add / remove / updateQty / clear / count / serialize / deserialize` with schema version, storage abstraction injected (so tests use an in-memory store, prod uses `localStorage`, and a failing/blocked `localStorage` degrades gracefully). Same motif+kind+colour+hook merges into one line with qty.
- `ui/product-options.js`: radio-group semantics for kind/colour/hook (`<fieldset>` + `<input type="radio">` styled as swatches — works without JS and is accessible), hides the hook group for keyrings, updates the CTA price and the main image tint.
- Cart badge updates across tabs via the `storage` event.
- `lib/order.js`: `formatOrderText(cart)` → Swedish plain-text order for Instagram DM; `ui/cart-page.js` uses `navigator.clipboard.writeText` with a fallback (select-text) and opens `https://ig.me/m/cutie.poppers`.

### 5.4 Checkout & thank-you (F12, F13)
- Form is a real `<form method="post" action="…">` with HTML validation (`required`, `type="tel"`, `type="email"`, `autocomplete` attributes, `inputmode="numeric"` on postnummer) + JS validation messages in Swedish (`lib/validate.js`: Swedish mobile number, postnummer `NNN NN`, e-mail).
- Order payload = form fields + cart lines; **prices recomputed server-side**, never trusted from the client.
- Order number: short, human-friendly (e.g. `CP-2611-7K3`), generated by the endpoint.
- **Decision D1, decided: Cloudflare Worker.** The order endpoint `POST /api/orders` is handled by the Worker that also serves the site (D4). On Cloudflare's free tier it:
  1. validates the fields and the honeypot, and verifies the Turnstile token (invisible, no cookies);
  2. rate-limits per IP;
  3. recomputes every line price from the same product/price data the site is built from (shared module, bundled into the Worker);
  4. generates the order number;
  5. e-mails the owner the order and the customer a confirmation via Resend (sending subdomain `send.cutiepoppers.shop`, with SPF/DKIM records in Cloudflare DNS);
  6. returns `{ orderNumber, summary }` as JSON.
  - It's on the same origin as the site, so no CORS is needed, and the form posts to a relative URL. That makes preview deployments and local `wrangler dev` work unchanged.
  - No database: orders exist only as e-mails (simplest for GDPR; revisit if order history is needed).
  - Code in `worker/`, deployed together with the static site (§8.4); secrets (`RESEND_API_KEY`, `TURNSTILE_SECRET`) in Cloudflare, never in the repo.
  - Tested with Vitest + `@cloudflare/vitest-pool-workers` (unit), and Playwright e2e against `wrangler dev` with the e-mail provider stubbed.
  - Rejected alternative: a form service (Formspree / Web3Forms). Less setup, but no server-side price check, no reliable order number, and customer confirmation e-mails are paid.
- Thank-you page reads the last order summary from `sessionStorage`, clears the cart, and shows the order number. Swish stays a manual payment request from the owner's private Swish (D5). Swish Företag isn't needed at today's volumes; revisit if sales grow (see Risks).
- Legal and info pages (needed once we take orders with personal data). The seller is **Magnus Nordin, Huddinge**, contact `hej@cutiepoppers.shop`:
  - **köpvillkor:** prices incl. moms if applicable, shipping calculated after ordering, delivery in Sweden only, dispatch 3–4 arbetsdagar after payment, payment by Swish. Returns use the simple default: *"Fel på varan? Hör av dig så ersätter vi den."* Add the ångerrätt wording from Konsumentverket's guidance; made-to-order items in a chosen colour may be exempt, so check the wording.
  - **integritetspolicy:** what is stored (only the order e-mail), why, how long, and processors (Cloudflare, Resend, Umami).
  - **frakt-och-leverans:** PostNord, Sweden only, shipping weighed and added to the Swish request, 3–4 arbetsdagar.
  - **så-beställer-du:** the 3 steps from the checkout design. The Swish request comes *inom 1–2 dagar*.
  - **kontakt:** e-mail, Instagram, Facebook.
- Fixed copy values from D5 live in `site.js`, so they're changed in one place: dispatch "3–4 arbetsdagar", response "inom 1–2 dagar", seller name and city, contact e-mail, social URLs.

## 6. SEO plan

On-page / technical:
- Static HTML for every page; `<html lang="sv">`; one `<h1>` per page.
- Unique `<title>` and meta description per product and category, generated from data with templates, e.g. `Övertänkare – 3D-printade örhängen 50 kr | Cutie Poppers`. Rewrite the current "treats and sweets" description.
- `<link rel="canonical">` on every page; `noindex` on cart/checkout/thank-you.
- Open Graph + Twitter card tags with a per-product 1200×630 image (generated at build from the product photo + brand frame) — important since traffic comes from Instagram/Facebook.
- **JSON-LD**: `Organization` + `WebSite` on the home page; `Product` with `Offer`s (`priceCurrency: SEK`, `price`, `availability`, `itemCondition`, `hasMerchantReturnPolicy`; `shippingDetails` is omitted while shipping is weighed per order, and Merchant Center gets an approximate rate in its own settings) on product pages; `BreadcrumbList`; `ItemList` on category pages. No `aggregateRating` until there are real reviews. Validated in build tests against required properties.
- `sitemap.xml` (with `lastmod` from `addedAt`/git) and `robots.txt` referencing it; real `404.html`.
- Descriptive, Swedish image `alt` texts and file names (`overtankare-orhangen-rod.jpg`).
- Internal linking: product → its categories and "fler motiv i Marint"; footer links; breadcrumbs.
- Unique descriptions per product: today all 36 share the same boilerplate after the first sentence. Write 1–2 unique sentences per motif, keep the material/hook text as a shared "facts" block (F9) — avoids duplicate-content signals.
- Content pages that match searches: "örhängen för känsliga öron", "nickelfria örhängen", "3D-printade örhängen", "marina örhängen", "souvenir från Hjo". The category intros and the unique product descriptions can carry this naturally (there is no about block).

Performance (Core Web Vitals are a ranking factor):
- Images through `@11ty/eleventy-img`: AVIF + WebP + JPEG fallback, widths 320/640/960/1280, `srcset`/`sizes`, explicit `width`/`height`, `loading="lazy"` except the LCP image (`fetchpriority="high"`). Replaces `generate-thumbs.js`; originals stay out of the deploy (cuts the 155 MB).
- **Self-host fonts** (Anton, DM Sans, Yellowtail; Latin subset incl. åäö) with `font-display: swap` and preload for Anton. Also avoids sending visitor IPs to Google (German court rulings on Google Fonts + GDPR).
- Inline critical CSS or keep a single small stylesheet; no render-blocking JS (`type="module"` is deferred).
- Budgets enforced in CI with **Lighthouse CI**: Performance ≥ 95, SEO = 100, Accessibility ≥ 95, Best Practices ≥ 95 on `/`, a product page and a category page.

Off-page / after launch:
- Register the domain in **Google Search Console** and **Bing Webmaster Tools**, submit the sitemap, verify via DNS TXT.
- **Google Merchant Center** free listings (product feed can be generated at build from the same data) — free visibility in Google Shopping.
- Google Business Profile if there's a physical connection to Hjo/the west coast.
- Link from the Instagram/Facebook bio to the site; use product URLs (with UTM tags) in posts.

## 7. Analytics

Requirement: understand traffic and the funnel without a cookie banner.

| Tool | Cookieless / no banner | Cost | Custom events/funnels | Notes |
|---|---|---|---|---|
| Plausible (EU-hosted) | Yes | ~€9/month | Yes, funnels, goals, UTM | Most polished, but paid, so not chosen |
| **Umami Cloud** | Yes | Free Hobby tier | Yes, events, funnels, UTM | **Chosen.** Can self-host later (e.g. on Cloudflare) if the free tier is outgrown |
| GoatCounter | Yes | Free (donation) | Basic | Very simple |
| Cloudflare Web Analytics | Yes | Free | No custom events | Only page views; one click to enable now that we host on Cloudflare. A good free baseline alongside the main tool. |
| Google Analytics 4 | **No** — needs consent banner in EU/Sweden (IMY) | Free | Yes | Not recommended: banner hurts UX, GDPR risk |

**Decision D2, decided: free tools only.** **Umami Cloud** (Hobby tier) handles page views, custom events and the funnel. **Cloudflare Web Analytics** is a free, zero-config baseline that also shows Core Web Vitals from real visitors. Both are cookieless, so no consent banner is needed; list them in the integritetspolicy. The Umami script loads with `defer`, only in production builds (not on previews or in tests). Check the Hobby tier's monthly event cap and data-retention period at signup; at today's traffic the cap is far away.

Events (implemented in `lib/analytics.js` as a thin wrapper `track(name, props)` that is a no-op when the tool isn't loaded — unit tested):
`filter_category`, `view_product` (page view), `select_kind`, `select_color`, `add_to_cart` {motif, kind, color, hook, price}, `remove_from_cart`, `begin_checkout`, `order_submitted` {items, value}, `order_failed`, `instagram_order_copied`, `outbound_instagram`. Funnel: Startsida → Produkt → add_to_cart → begin_checkout → order_submitted. UTM tagging convention for Instagram/Facebook links.

## 8. Testing strategy

### 8.1 Unit tests — Vitest (+ happy-dom for DOM modules)
- `lib/*`: cart, pricing, order text, filter, validation, slug, format (sv-SE currency), analytics wrapper — **≥ 95 % line/branch coverage**, enforced in CI.
- `ui/*`: mount the server-rendered HTML fragment into happy-dom, dispatch events, assert DOM/state (e.g. picking "Nyckelring" hides the hook group and changes the CTA to "30 kr").
- `eleventy.config.js` filters/shortcodes (slugify with åäö, price formatting, JSON-LD builders, meta-description generator) — pure functions, tested directly.
- Data: `products.json` schema validation, unique slugs, every product has ≥ 1 image that exists, every category referenced exists, alt texts non-empty.
- Order endpoint (if Worker): validation, server-side pricing, order-number format, spam rejection, e-mail provider mocked.
- **Overall threshold: ≥ 90 %** coverage across `src/assets/js`, `eleventy.config.js`, `scripts/`, `worker/`.

### 8.2 Build/output tests — Vitest + linkedom
Run Eleventy programmatically once, then assert on generated files:
- one page per product, correct canonical/title/description, `noindex` where expected;
- JSON-LD parses and has required `Product`/`Offer` fields;
- every internal link resolves (no 404s), every `<img>` has `alt`, `width`, `height`;
- `sitemap.xml` lists exactly the indexable pages.

### 8.3 End-to-end — Playwright
Runs against the built `_site` served locally (and the Worker in local mode, or a mocked route). Projects: mobile Chromium (390×844 like the design), mobile WebKit (iPhone Safari is the main audience from Instagram), desktop Chromium.
1. Browse: home → filter "Marint" → URL updates → open "Krabba" product page.
2. Configure: choose Örhängen, Röd, Guld → CTA shows "50 kr" → add → badge shows 1.
3. Keyring hides hook picker and prices 30 kr.
4. Cart: lines, remove, totals, persistence after reload, sync across two tabs.
5. Instagram order: clipboard contains the formatted order (clipboard permission granted in test).
6. Checkout: validation errors in Swedish, successful submit → thank-you page with order number, cart cleared; failed submit shows an error and keeps the cart.
7. No-JS smoke test (`javaScriptEnabled: false`): products, prices and product pages still readable.
8. Accessibility: `@axe-core/playwright` on every page template, zero serious/critical violations; keyboard-only run through the purchase flow.
9. Analytics: assert the expected `track` calls via a stubbed `window.umami`.
10. Optional: visual regression screenshots of the 5 designed screens at 390 px.

### 8.4 CI — GitHub Actions
`ci.yml` on every PR: install → lint (ESLint + Stylelint + Prettier check) → data validation → unit + build tests with coverage → build → Playwright → Lighthouse CI → **preview deploy**. The preview deploy runs `wrangler versions upload`, which gives a preview URL for that PR's version, and posts the URL as a PR comment. The preview uses Resend's test mode, so no real e-mails are sent.

`deploy.yml` on `main`: build, then `wrangler deploy`. This publishes the static `_site` and the order Worker as **one Cloudflare Worker with static assets**, which is Cloudflare's current recommended setup for new projects; Cloudflare Pages would work equally well. It uses a `CLOUDFLARE_API_TOKEN` scoped to Workers, stored as a GitHub secret. This replaces the manual `gh-pages` script.

What Cloudflare hosting enables in the build:
- `_headers`: long-lived immutable caching for hashed CSS/JS/images and short caching for HTML. Also security headers: CSP, HSTS, `Referrer-Policy`, `Permissions-Policy`, and `X-Robots-Tag: noindex` on cart/checkout/thank-you as well as the meta tag.
- `_redirects`: real 301s, generated from a `redirects.json` in the data when a product slug is renamed. Also `www.cutiepoppers.shop` → `cutiepoppers.shop`.
- A custom `404.html` served with a real 404 status.

### 8.5 Hosting migration: GitHub Pages + one.com DNS → Cloudflare (D4)
Current state: nameservers `ns01/ns02.one.com`; A records → GitHub Pages; `www` CNAME → `magnusnordin.github.io`; one.com MX records (no mail is used on the domain). Low traffic, so a short interruption is acceptable.

1. Create a Cloudflare account (free plan) and add the zone `cutiepoppers.shop`. Cloudflare imports the existing records; check them against the list above.
2. At one.com, switch the nameservers to the two Cloudflare ones. If the domain is registered elsewhere, do it at that registrar. Wait for the zone to show "Active", usually within hours. The site keeps working throughout, because the imported records still point to GitHub Pages.
3. Remove the one.com MX records (no mail is used). Turn on **Cloudflare Email Routing** (free) and forward `hej@cutiepoppers.shop` to the owner's Gmail; this adds Cloudflare's MX + SPF records. In phase 4, add Resend's records (DKIM on `resend._domainkey`, return-path MX/SPF on `send.`) and a DMARC record (`p=none` to start). Order and confirmation e-mails are then sent *from* `hej@cutiepoppers.shop`, and replies land in Gmail.
4. Develop the new site on `*.workers.dev` and preview URLs. **Launch** = attach the custom domains `cutiepoppers.shop` and `www` to the Worker, which replaces the GitHub Pages A/CNAME records.
5. After launch: disable GitHub Pages for the repo, and delete `public/CNAME` and the `gh-pages` branch and dependency. Re-verify Search Console with a DNS TXT record on Cloudflare.

Optionally, the domain registration can also move to Cloudflare Registrar later (sold at cost, no markup). That isn't needed now.

## 9. Phases

Each phase ends deployable, with its tests green.

| Phase | Scope | Done when |
|---|---|---|
| **0. Decisions & content** ✔ | D1–D5 decided; product descriptions approved (`docs/product-descriptions.md`) | Done |
| **1. Foundation** | Eleventy + CSS tokens + header/footer; data migration + schema; image pipeline; fonts; Vitest/Playwright/CI scaffolding; delete React/CRA; Cloudflare account, DNS move (§8.5 steps 1–3), Worker deploy to `workers.dev` + PR previews | Start page renders static grid from data on a preview URL; CI green; Lighthouse ≥ 95; old site still live via Cloudflare DNS |
| **2. Catalogue & SEO base** | Product pages (F9 without cart), category pages + chips (F3), grid reveal (F4), carousel (F6), colour/hook explainer (F5), info and legal pages, meta/canonical/OG/JSON-LD/sitemap/robots/404 | All products indexable; build tests cover SEO tags; e2e flow 1 & 7 |
| **3. Cart** | Cart lib + product options + badge + cart page + Instagram order text (F10, F11) | e2e flows 2–5 |
| **4. Ordering** | Order endpoint, checkout form, validation, thank-you, e-mails, spam protection, legal pages (F12, F13) | e2e flow 6; test order received end-to-end on staging |
| **5. Analytics & launch** | Analytics script + events, Cloudflare Web Analytics, desktop polish, a11y audit; **cutover**: custom domains on the Worker, retire GitHub Pages (§8.5 steps 4–5); Search Console/Bing, Merchant Center feed | cutiepoppers.shop served by Cloudflare; funnel visible in dashboard; sitemap submitted |

Rough size: phase 1 ≈ 2–3 days, 2 ≈ 2–3 days, 3 ≈ 2 days, 4 ≈ 2–3 days, 5 ≈ 1 day (excluding content/photo work).

## 10. Decisions needed

- ~~**D1 Order endpoint**~~ — **decided: Cloudflare Worker** (§5.4). Needs: Resend account, and its sending DNS records on `send.cutiepoppers.shop` in Cloudflare.
- ~~**D2 Analytics**~~: **decided: Umami Cloud (free) + Cloudflare Web Analytics** (§7). Needs: an Umami Cloud account.
- ~~**D3 Category mapping**~~: **decided** (§4). Marint replaces Västkust, Souvenir is added for the Hjo motifs, and the carousel shows Marint.
- ~~**D4 Hosting**~~: **decided: Cloudflare.** The site and the order endpoint run as one Worker with static assets, and DNS moves from one.com to Cloudflare (§8.4, §8.5). Needs: Cloudflare account, and access to the domain registrar (one.com) to change nameservers.
- ~~**D5 Content**~~: **decided.**
  - Shipping calculated after ordering (PostNord, weighed), no pickup, Sweden only.
  - Dispatch 3–4 arbetsdagar; Swish request inom 1–2 dagar; private Swish.
  - Orders go to the owner's Gmail. This is a Worker variable `ORDER_TO_EMAIL`, never committed, because the repo may be public.
  - Public contact `hej@cutiepoppers.shop` via Email Routing. Footer has Instagram + Facebook. Seller is Magnus Nordin, Huddinge.
  - Returns use the simple default. All 10 colours for all motifs and both kinds. Prices 50 / 30 kr.
  - Size per product (see §4 note). Unique descriptions drafted in `docs/product-descriptions.md`. **No about block.**
  - **Photos later:** launch with today's product photos on the design's pastel tint backgrounds, one photo set per motif (it does not change with the chosen colour). The hero uses a collage or the best existing product photos until there's an on-ear photo. Swapping in new photos later only means dropping the files in and updating `images` in the data.

## 11. Risks

- **Private Swish for sales:** banks' Swish terms are meant for private payments. Fine at today's very low volume, but if sales grow, look at registering an enskild firma + Swish Företag (and Skatteverket's rules for hobby vs business income).

- **Photos:** the design relies on attractive on-ear photos; with only the current product shots the result will look weaker. Plan a photo session or keep the tinted backgrounds from the design.
- **Colour availability:** the design implies every motif in all 10 colours; confirm that's true, otherwise add per-product `colors`.
- **Spam/abuse of the order form** → Turnstile + honeypot + rate limit in the Worker.
- **Instagram in-app browser** (where most visitors arrive): test clipboard, `localStorage` and form submit in it explicitly; WebKit e2e covers most of it.
