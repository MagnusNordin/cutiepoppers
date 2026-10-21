const NBSP = " ";

/** 5000 -> "50 kr", 123400 -> "1 234 kr" (Swedish grouping, non-breaking spaces). */
export function formatKr(ore) {
  const kr = Math.round(ore) / 100;
  const text = Number.isInteger(kr)
    ? kr.toLocaleString("sv-SE")
    : kr.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${text.replace(/\s/g, NBSP)}${NBSP}kr`;
}

/** 4 -> "ca 4 cm", 4.5 -> "ca 4,5 cm" */
export function formatSize(cm) {
  return `ca ${String(cm).replace(".", ",")} cm`;
}

/** "1 vara" / "3 varor" */
export function pluralItems(n) {
  return `${n} ${n === 1 ? "vara" : "varor"}`;
}

/** "1 motiv" / "8 motiv" (same in plural) */
export function pluralMotifs(n) {
  return `${n} motiv`;
}

/** Lowercase ASCII slug with Swedish letters transliterated. */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
