// POST /api/orders: validate, verify Turnstile, price server-side, e-mail, return order number.
import products from "../src/_data/products.json" with { type: "json" };
import { normaliseItem } from "../src/js/lib/cart.js";
import { findKind, MAX_LINES, SHOP } from "../src/js/lib/catalog.js";
import { describeOptions } from "../src/js/lib/order.js";
import { lineTotal, subtotal } from "../src/js/lib/pricing.js";
import { validateCheckout } from "../src/js/lib/validate.js";
import { customerEmail, ownerEmail, sendEmail } from "./email.js";
import { json } from "./respond.js";

const MAX_BODY_BYTES = 20_000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const productsBySlug = new Map(products.map((p) => [p.slug, p]));

const defaultRandom = (n) => crypto.getRandomValues(new Uint8Array(n));

/** "CP-2610-7K3M": year+month and four unambiguous characters. */
export function orderNumber(now, randomBytes = defaultRandom) {
  const yymm = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const suffix = [...randomBytes(4)].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `CP-${yymm}-${suffix}`;
}

/** Validate cart lines against the real catalogue; names and prices come from the server. */
export function validateItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return { error: "Varukorgen är tom." };
  if (rawItems.length > MAX_LINES) return { error: "För många rader i varukorgen." };
  const items = [];
  for (const raw of rawItems) {
    const item = normaliseItem(raw);
    const product = item && productsBySlug.get(item.slug);
    if (!item || !product || !product.inStock) return { error: "En vara i varukorgen finns inte längre." };
    items.push({
      slug: item.slug,
      name: product.name,
      kind: item.kind,
      kindLabel: findKind(item.kind).label,
      color: item.color,
      hook: item.hook,
      options: describeOptions(item),
      qty: item.qty,
      unitOre: findKind(item.kind).priceOre,
      totalOre: lineTotal(item),
    });
  }
  return { items };
}

export async function verifyTurnstile(env, fetchFn, token, ip) {
  if (!token || typeof token !== "string") return false;
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  try {
    const res = await fetchFn("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verify failed", err);
    return false;
  }
}

export async function handleOrder(request, env, deps = {}) {
  const fetchFn = deps.fetch || fetch;
  const now = deps.now ? deps.now() : new Date();
  const random = deps.random || defaultRandom;

  if (request.method !== "POST") return json({ error: "Använd POST." }, 405, { allow: "POST" });
  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return json({ error: "Fel format." }, 415);
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "Beställningen är för stor." }, 413);

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Fel format." }, 400);
  }
  if (!body || typeof body !== "object") return json({ error: "Fel format." }, 400);

  // Honeypot: bots fill every field. Pretend success, send nothing.
  if (body.website) return json({ orderNumber: orderNumber(now, random), items: [], subtotalOre: 0 });

  const ip = request.headers.get("cf-connecting-ip") || "";
  if (env.ORDER_LIMITER) {
    const { success } = await env.ORDER_LIMITER.limit({ key: ip || "unknown" });
    if (!success) return json({ error: "För många beställningar på kort tid. Vänta en minut och försök igen." }, 429);
  }

  const { values: customer, errors } = validateCheckout(body.customer || {});
  if (Object.keys(errors).length) return json({ error: "Kolla de markerade fälten.", fields: errors }, 422);

  const { items, error } = validateItems(body.items);
  if (error) return json({ error }, 422);

  if (!(await verifyTurnstile(env, fetchFn, body.turnstileToken, ip))) {
    return json({ error: "Vi kunde inte verifiera att du inte är en robot. Ladda om sidan och försök igen." }, 403);
  }

  const order = {
    number: orderNumber(now, random),
    createdAt: now.toISOString(),
    customer,
    items,
    subtotalOre: subtotal(items),
  };

  const owner = ownerEmail(order);
  const sent = await sendEmail(env, fetchFn, { ...owner, to: env.ORDER_TO_EMAIL, replyTo: customer.email });
  if (!sent) {
    return json(
      { error: "Beställningen kunde inte skickas just nu. Försök igen om en stund, eller beställ via Instagram." },
      502,
    );
  }

  if (env.SEND_CUSTOMER_CONFIRMATION === "true") {
    const confirmation = customerEmail(order, SHOP);
    const ok = await sendEmail(env, fetchFn, {
      ...confirmation,
      to: customer.email,
      replyTo: env.REPLY_TO || undefined,
    });
    if (!ok) console.error(`Customer confirmation failed for ${order.number}`);
  }

  return json({
    orderNumber: order.number,
    subtotalOre: order.subtotalOre,
    items: items.map(({ name, kindLabel, options, qty, totalOre }) => ({ name, kindLabel, options, qty, totalOre })),
  });
}
