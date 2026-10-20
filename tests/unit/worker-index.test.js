import { describe, expect, it, vi } from "vitest";
import worker, { json } from "../../worker/index.js";

describe("worker", () => {
  it("serves static assets for normal paths", async () => {
    const env = { ASSETS: { fetch: vi.fn(async () => new Response("<html>")) } };
    const res = await worker.fetch(new Request("https://x.dev/motiv/krabba/"), env);
    expect(await res.text()).toBe("<html>");
    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
  });

  it("returns JSON 404 for unknown API routes", async () => {
    const env = { ASSETS: { fetch: vi.fn() } };
    const res = await worker.fetch(new Request("https://x.dev/api/nope"), env);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Hittades inte" });
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("json() sets no-store and content type", async () => {
    const res = json({ ok: true }, 201, { "x-test": "1" });
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(res.headers.get("x-test")).toBe("1");
  });
});
