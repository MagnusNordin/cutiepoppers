# Cutie Poppers

Static web shop for [cutiepoppers.shop](https://cutiepoppers.shop): 3D-printed earrings and keyrings.

- **Site:** [Eleventy](https://www.11ty.dev/) builds plain HTML from `src/`, enhanced with small vanilla JS modules (no framework).
- **Hosting and orders:** one Cloudflare Worker (`worker/`) serves the static files and handles `POST /api/orders`.
- **Plan and decisions:** [docs/redesign-plan.md](docs/redesign-plan.md).

## Getting started

```bash
npm install
npm run dev          # Eleventy dev server on http://localhost:8080 (no order API)
npm run worker:dev   # the real Worker + built site on http://localhost:8788 (run a build first)
```

## Scripts

| Script                  | What it does                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `npm run build`         | Production build into `_site/`                                   |
| `npm run validate`      | Validate `src/_data/products.json` and `categories.json`         |
| `npm test`              | Unit tests (Vitest)                                              |
| `npm run test:coverage` | Unit tests with coverage thresholds                              |
| `npm run test:build`    | Checks on the generated HTML (needs a build)                     |
| `npm run test:e2e`      | Playwright end-to-end tests (builds and starts the Worker)       |
| `npm run lint`          | ESLint, Stylelint and Prettier                                   |
| `npm run deploy`        | Deploy the Worker + `_site` to Cloudflare (CI does this on main) |

## Where things live

| Path                         | Contents                                                       |
| ---------------------------- | -------------------------------------------------------------- |
| `src/_data/products.json`    | The catalogue: one entry per motif                             |
| `src/_data/categories.json`  | Category chips and pages                                       |
| `src/_data/site.js`          | Shop-wide settings: contact, texts, public keys                |
| `src/js/lib/`                | Pure logic shared by browser and Worker (catalogue, cart, ...) |
| `src/js/ui/`                 | Small page scripts that wire the logic to the HTML             |
| `src/images/products/`       | Original product photos (resized at build time)                |
| `config/`                    | Build helpers: images, SEO/JSON-LD, catalogue                  |
| `worker/`                    | Cloudflare Worker: static assets + order API                   |
| `tests/unit`, `build`, `e2e` | Tests                                                          |

### Adding a product

1. Put the photo in `src/images/products/` (lowercase, e.g. `seal-grey.jpg`).
2. Add an entry to `src/_data/products.json` with a unique `slug`, categories, size, description and image alt text.
3. Run `npm run validate && npm test`.

## Worker secrets

These are set with `npx wrangler secret put <NAME>` and are never in the repo: `TURNSTILE_SECRET`, `RESEND_API_KEY` and `ORDER_TO_EMAIL`.
