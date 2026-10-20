// Cloudflare Worker: serves the static site (assets binding) and the order API.

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Hittades inte" }, 404);
    }
    return env.ASSETS.fetch(request);
  },
};
