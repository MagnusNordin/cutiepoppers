// Checkout validation shared by the browser (instant feedback) and the Worker (authoritative).

export const FIELDS = ["name", "phone", "email", "street", "zip", "city", "message"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const clean = (v) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** Swedish mobile number -> "0701234567", or null. Accepts 07..., +467..., 00467... with spaces/dashes. */
export function normalisePhone(input) {
  const digits = clean(input).replace(/[\s\-()]/g, "");
  let national = digits;
  if (/^\+46/.test(digits)) national = "0" + digits.slice(3);
  else if (/^0046/.test(digits)) national = "0" + digits.slice(4);
  return /^07\d{8}$/.test(national) ? national : null;
}

/** "0701234567" -> "070-123 45 67" */
export function formatPhone(national) {
  return `${national.slice(0, 3)}-${national.slice(3, 6)} ${national.slice(6, 8)} ${national.slice(8)}`;
}

/** "12345" or "123 45" -> "123 45", or null. */
export function normaliseZip(input) {
  const digits = clean(input).replace(/\s/g, "");
  return /^\d{5}$/.test(digits) ? `${digits.slice(0, 3)} ${digits.slice(3)}` : null;
}

/**
 * Validate checkout fields. Returns { values, errors } where errors maps
 * field -> Swedish message. `values` holds cleaned, normalised data.
 */
export function validateCheckout(input = {}) {
  const errors = {};
  const values = {};

  values.name = clean(input.name);
  if (values.name.length < 2) errors.name = "Skriv ditt för- och efternamn.";
  else if (values.name.length > 100) errors.name = "Namnet är för långt.";

  const phone = normalisePhone(input.phone);
  if (!phone) errors.phone = "Skriv ett svenskt mobilnummer, t.ex. 070-123 45 67.";
  else values.phone = formatPhone(phone);

  values.email = clean(input.email).toLowerCase();
  if (!EMAIL_RE.test(values.email) || values.email.length > 200) errors.email = "Skriv en giltig e-postadress.";

  values.street = clean(input.street);
  if (values.street.length < 3) errors.street = "Skriv gatuadress och nummer.";
  else if (values.street.length > 120) errors.street = "Adressen är för lång.";

  const zip = normaliseZip(input.zip);
  if (!zip) errors.zip = "Postnumret ska ha fem siffror.";
  else values.zip = zip;

  values.city = clean(input.city);
  if (values.city.length < 2) errors.city = "Skriv ort.";
  else if (values.city.length > 60) errors.city = "Orten är för lång.";

  values.message = typeof input.message === "string" ? input.message.trim().slice(0, 1000) : "";
  if (values.message.length > 500) errors.message = "Meddelandet får vara högst 500 tecken.";

  return { values, errors };
}
