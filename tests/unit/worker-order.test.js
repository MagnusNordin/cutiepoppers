import { beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../../worker/index.js";
import { handleOrder, orderNumber, validateItems, verifyTurnstile } from "../../worker/order.js";

const customer = {
  name: "Anna Andersson",
  phone: "0701234567",
  email: "anna@example.se",
  street: "Storgatan 1",
  zip: "12345",
  city: "Huddinge",
  message: "",
};
const items = [
  { slug: "krabba", kind: "earring", color: "rod", hook: "guld", qty: 2, name: "HACKED", priceOre: 1 },
  { slug: "kaffe", kind: "keyring", color: "svart", qty: 1 },
];

const env = (over = {}) => ({
  TURNSTILE_SECRET: "secret",
  RESEND_API_KEY: "re_key",
  ORDER_TO_EMAIL: "owner@example.se",
  EMAIL_FROM: "Cutie Poppers <onboarding@resend.dev>",
  REPLY_TO: "hej@cutiepoppers.shop",
  SEND_CUSTOMER_CONFIRMATION: "false",
  ...over,
});

function post(body, headers = {}) {
  return new Request("https://cutiepoppers.shop/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.5", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** fetch mock: Turnstile says `turnstileOk`, Resend answers `resendStatus`. */
function mockFetch({ turnstileOk = true, resendStatus = 200 } = {}) {
  return vi.fn(async (url) => {
    if (String(url).includes("turnstile")) return Response.json({ success: turnstileOk });
    return new Response(resendStatus === 200 ? '{"id":"1"}' : "boom", { status: resendStatus });
  });
}

const deps = (fetch) => ({
  fetch,
  now: () => new Date("2026-10-20T12:00:00Z"),
  random: () => new Uint8Array([0, 1, 2, 3]),
});
const body = (over = {}) => ({ customer, items, turnstileToken: "tok", website: "", ...over });

describe("orderNumber", () => {
  it("uses year+month and four unambiguous characters", () => {
    expect(orderNumber(new Date("2026-10-20T00:00:00Z"), () => new Uint8Array([0, 1, 2, 31]))).toBe("CP-2610-ABC9");
    expect(orderNumber(new Date())).toMatch(/^CP-\d{4}-[A-HJ-NP-Z2-9]{4}$/);
  });
});

describe("validateItems", () => {
  it("prices lines from the catalogue and ignores client names/prices", () => {
    const { items: out } = validateItems(items);
    expect(out[0]).toMatchObject({ name: "Krabba", unitOre: 5000, totalOre: 10000, options: "Röd · guldkrok" });
    expect(out[1]).toMatchObject({ name: "Kaffe", hook: null, totalOre: 3000 });
  });

  it("rejects empty, oversized, unknown and invalid carts", () => {
    expect(validateItems([]).error).toBe("Varukorgen är tom.");
    expect(validateItems("x").error).toBe("Varukorgen är tom.");
    expect(validateItems(Array(31).fill(items[1])).error).toContain("För många");
    expect(validateItems([{ ...items[1], slug: "finns-inte" }]).error).toContain("finns inte");
    expect(validateItems([{ ...items[0], color: "magenta" }]).error).toContain("finns inte");
  });
});

describe("verifyTurnstile", () => {
  it("posts the secret, token and IP", async () => {
    const fetch = mockFetch();
    expect(await verifyTurnstile(env(), fetch, "tok", "1.2.3.4")).toBe(true);
    const form = fetch.mock.calls[0][1].body;
    expect(form.get("secret")).toBe("secret");
    expect(form.get("response")).toBe("tok");
    expect(form.get("remoteip")).toBe("1.2.3.4");
  });

  it("fails without token, on rejection and on network errors", async () => {
    expect(await verifyTurnstile(env(), mockFetch(), "", "")).toBe(false);
    expect(await verifyTurnstile(env(), mockFetch({ turnstileOk: false }), "tok")).toBe(false);
    const broken = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await verifyTurnstile(env(), broken, "tok")).toBe(false);
  });
});

describe("handleOrder", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("accepts a valid order, e-mails the owner and returns the order number", async () => {
    const fetch = mockFetch();
    const res = await handleOrder(post(body()), env(), deps(fetch));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.orderNumber).toBe("CP-2610-ABCD");
    expect(data.subtotalOre).toBe(13000);
    expect(data.items[0]).toEqual({
      name: "Krabba",
      kindLabel: "Örhängen",
      options: "Röd · guldkrok",
      qty: 2,
      totalOre: 10000,
    });

    const resendCalls = fetch.mock.calls.filter(([url]) => String(url).includes("resend"));
    expect(resendCalls).toHaveLength(1);
    const sent = JSON.parse(resendCalls[0][1].body);
    expect(sent.to).toEqual(["owner@example.se"]);
    expect(sent.reply_to).toBe("anna@example.se");
    expect(sent.subject).toBe("Ny beställning CP-2610-ABCD – 130 kr + frakt");
    expect(sent.text).toContain("Mobil (Swish): 070-123 45 67");
    expect(resendCalls[0][1].headers.authorization).toBe("Bearer re_key");
  });

  it("also confirms to the customer when enabled", async () => {
    const fetch = mockFetch();
    await handleOrder(post(body()), env({ SEND_CUSTOMER_CONFIRMATION: "true" }), deps(fetch));
    const sent = fetch.mock.calls.filter(([url]) => String(url).includes("resend")).map(([, o]) => JSON.parse(o.body));
    expect(sent.map((m) => m.to[0])).toEqual(["owner@example.se", "anna@example.se"]);
    expect(sent[1].reply_to).toBe("hej@cutiepoppers.shop");
    expect(sent[1].text).toContain("inom 1–2 dagar");
  });

  it("still succeeds when only the customer confirmation fails", async () => {
    let n = 0;
    const fetch = vi.fn(async (url) => {
      if (String(url).includes("turnstile")) return Response.json({ success: true });
      n += 1;
      return new Response("x", { status: n === 1 ? 200 : 500 });
    });
    const res = await handleOrder(post(body()), env({ SEND_CUSTOMER_CONFIRMATION: "true", REPLY_TO: "" }), deps(fetch));
    expect(res.status).toBe(200);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Customer confirmation failed"));
  });

  it("returns 502 when the owner e-mail can't be sent", async () => {
    const res = await handleOrder(post(body()), env(), deps(mockFetch({ resendStatus: 500 })));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("Instagram");
  });

  it("only logs in dry-run mode", async () => {
    const fetch = mockFetch();
    const res = await handleOrder(post(body()), env({ EMAIL_DRY_RUN: "true" }), deps(fetch));
    expect(res.status).toBe(200);
    expect(fetch.mock.calls.some(([url]) => String(url).includes("resend"))).toBe(false);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[email dry-run] to=owner@example.se"));
  });

  it("uses the default sender when EMAIL_FROM is unset", async () => {
    const fetch = mockFetch();
    await handleOrder(post(body()), env({ EMAIL_FROM: undefined }), deps(fetch));
    const call = fetch.mock.calls.find(([url]) => String(url).includes("resend"));
    expect(JSON.parse(call[1].body).from).toBe("Cutie Poppers <onboarding@resend.dev>");
  });

  it("rejects wrong methods, content types, sizes and bad JSON", async () => {
    const get = new Request("https://x/api/orders");
    expect((await handleOrder(get, env(), deps(mockFetch()))).status).toBe(405);
    expect((await handleOrder(post("{}", { "content-type": "text/plain" }), env(), deps(mockFetch()))).status).toBe(
      415,
    );
    expect((await handleOrder(post("x".repeat(20_001)), env(), deps(mockFetch()))).status).toBe(413);
    expect((await handleOrder(post("{oops"), env(), deps(mockFetch()))).status).toBe(400);
    expect((await handleOrder(post("null"), env(), deps(mockFetch()))).status).toBe(400);
  });

  it("pretends success for honeypot submissions without sending anything", async () => {
    const fetch = mockFetch();
    const res = await handleOrder(post(body({ website: "http://spam" })), env(), deps(fetch));
    expect(res.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rate limits per IP", async () => {
    const limiter = { limit: vi.fn(async () => ({ success: false })) };
    const res = await handleOrder(post(body()), env({ ORDER_LIMITER: limiter }), deps(mockFetch()));
    expect(res.status).toBe(429);
    expect(limiter.limit).toHaveBeenCalledWith({ key: "203.0.113.5" });
    const ok = { limit: vi.fn(async () => ({ success: true })) };
    const noIp = post(body(), { "cf-connecting-ip": "" });
    expect((await handleOrder(noIp, env({ ORDER_LIMITER: ok }), deps(mockFetch()))).status).toBe(200);
    expect(ok.limit).toHaveBeenCalledWith({ key: "unknown" });
  });

  it("returns field errors for invalid customers", async () => {
    const res = await handleOrder(post(body({ customer: { ...customer, phone: "123" } })), env(), deps(mockFetch()));
    expect(res.status).toBe(422);
    expect((await res.json()).fields.phone).toContain("mobilnummer");
    const none = await handleOrder(post({ items }), env(), deps(mockFetch()));
    expect(none.status).toBe(422);
  });

  it("rejects invalid carts", async () => {
    const res = await handleOrder(post(body({ items: [] })), env(), deps(mockFetch()));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("Varukorgen är tom.");
  });

  it("rejects failed Turnstile checks", async () => {
    const res = await handleOrder(post(body()), env(), deps(mockFetch({ turnstileOk: false })));
    expect(res.status).toBe(403);
  });
});

describe("worker routing", () => {
  it("routes /api/orders to the order handler", async () => {
    const res = await worker.fetch(new Request("https://x/api/orders"), env());
    expect(res.status).toBe(405);
  });

  it("turns unexpected errors into a 500 JSON response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const req = post(body());
    vi.spyOn(req, "text").mockRejectedValue(new Error("stream broke"));
    const res = await worker.fetch(req, env());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Något gick fel");
  });
});
