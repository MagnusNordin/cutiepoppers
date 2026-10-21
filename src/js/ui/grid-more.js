/**
 * "Visa alla N motiv": the full grid is in the HTML (crawlable, works without JS).
 * With JS we collapse it to the first items and reveal the rest on demand.
 */
export function initGridMore(root = document) {
  const grid = root.querySelector("[data-grid]");
  const button = root.querySelector("[data-grid-more]");
  if (!grid || !button || !grid.querySelector("[data-grid-extra]")) return;
  grid.classList.add("is-collapsed");
  button.hidden = false;
  button.addEventListener("click", () => {
    grid.classList.remove("is-collapsed");
    button.hidden = true;
    const firstExtra = grid.querySelector("[data-grid-extra] a");
    if (firstExtra) firstExtra.focus();
  });
}

/* c8 ignore next */
if (typeof document !== "undefined" && !globalThis.__CP_TEST__) initGridMore();
