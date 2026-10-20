// Cloudflare Worker: serves the static site (assets binding) and the order API.
import { handleOrder } from "./order.js";
import { json } from "./respond.js";

export { json };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/orders") {
      try {
        return await handleOrder(request, env);
      } catch (err) {
        console.error("Order failed", err);
        return json({ error: "Något gick fel. Försök igen, eller beställ via Instagram." }, 500);
      }
    }
    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Hittades inte" }, 404);
    }
    return env.ASSETS.fetch(request);
  },
};
