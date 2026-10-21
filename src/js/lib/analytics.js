/**
 * Send a custom event to Umami if it is loaded (production only).
 * Never throws: analytics must not break the shop.
 */
export function track(name, props, win = globalThis.window) {
  try {
    const umami = win && win.umami;
    if (umami && typeof umami.track === "function") {
      if (props) umami.track(name, props);
      else umami.track(name);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/** Track clicks on any element with data-track="event" (+ data-track-* props). */
export function bindTrackedLinks(root, win = globalThis.window) {
  root.addEventListener("click", (e) => {
    const el = e.target.closest && e.target.closest("[data-track]");
    if (!el) return;
    const props = {};
    for (const [key, value] of Object.entries(el.dataset)) {
      if (key.startsWith("track") && key !== "track") {
        props[key.charAt(5).toLowerCase() + key.slice(6)] = value;
      }
    }
    track(el.dataset.track, Object.keys(props).length ? props : undefined, win);
  });
}
