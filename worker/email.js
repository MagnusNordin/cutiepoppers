// Order e-mails: plain text + simple HTML, sent through the Resend API.
import { formatKr } from "../src/js/lib/format.js";

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const lineText = (l) =>
  `• ${l.name} – ${l.kindLabel}${l.qty > 1 ? ` × ${l.qty}` : ""} – ${l.options} – ${formatKr(l.totalOre)}`;

function itemsHtml(order) {
  const rows = order.items
    .map(
      (l) =>
        `<tr><td style="padding:4px 12px 4px 0">${escapeHtml(l.name)}</td><td style="padding:4px 12px 4px 0">${escapeHtml(l.kindLabel)}${l.qty > 1 ? ` × ${l.qty}` : ""}</td><td style="padding:4px 12px 4px 0">${escapeHtml(l.options)}</td><td style="padding:4px 0;text-align:right">${escapeHtml(formatKr(l.totalOre))}</td></tr>`,
    )
    .join("");
  return `<table style="border-collapse:collapse">${rows}<tr><td colspan="3" style="padding-top:8px"><strong>Summa</strong></td><td style="padding-top:8px;text-align:right"><strong>${escapeHtml(formatKr(order.subtotalOre))} + frakt</strong></td></tr></table>`;
}

export function ownerEmail(order) {
  const c = order.customer;
  const text = [
    `Ny beställning ${order.number}`,
    "",
    ...order.items.map(lineText),
    `Summa: ${formatKr(order.subtotalOre)} + frakt`,
    "",
    "OBS: väg paketet och lägg till PostNord-frakt i Swish-förfrågan.",
    "",
    `Namn: ${c.name}`,
    `Mobil (Swish): ${c.phone}`,
    `E-post: ${c.email}`,
    `Adress: ${c.street}, ${c.zip} ${c.city}`,
    c.message ? `Meddelande: ${c.message}` : "Meddelande: –",
  ].join("\n");
  const html = `<h2>Ny beställning ${escapeHtml(order.number)}</h2>${itemsHtml(order)}
<p><strong>OBS:</strong> väg paketet och lägg till PostNord-frakt i Swish-förfrågan.</p>
<p>${escapeHtml(c.name)}<br>Mobil (Swish): ${escapeHtml(c.phone)}<br>E-post: ${escapeHtml(c.email)}<br>${escapeHtml(c.street)}<br>${escapeHtml(c.zip)} ${escapeHtml(c.city)}</p>
<p>Meddelande: ${c.message ? escapeHtml(c.message).replace(/\n/g, "<br>") : "–"}</p>`;
  return { subject: `Ny beställning ${order.number} – ${formatKr(order.subtotalOre)} + frakt`, text, html };
}

export function customerEmail(order, site) {
  const c = order.customer;
  const text = [
    `Hej ${c.name}!`,
    "",
    `Tack för din beställning ${order.number} hos Cutie Poppers.`,
    "",
    ...order.items.map(lineText),
    `Summa: ${formatKr(order.subtotalOre)} + frakt`,
    "",
    `Vi hör av oss ${site.responseTime} med en Swish-förfrågan till ${c.phone} för varorna plus frakt.`,
    `När betalningen har kommit in printar vi dina varor och skickar dem inom ${site.dispatch}.`,
    "",
    `Leveransadress: ${c.street}, ${c.zip} ${c.city}`,
    "",
    "Frågor? Svara på det här mejlet.",
    "",
    "Hälsningar,",
    "Cutie Poppers",
  ].join("\n");
  const html = `<p>Hej ${escapeHtml(c.name)}!</p>
<p>Tack för din beställning <strong>${escapeHtml(order.number)}</strong> hos Cutie Poppers.</p>${itemsHtml(order)}
<p>Vi hör av oss ${escapeHtml(site.responseTime)} med en Swish-förfrågan till ${escapeHtml(c.phone)} för varorna plus frakt. När betalningen har kommit in printar vi dina varor och skickar dem inom ${escapeHtml(site.dispatch)}.</p>
<p>Leveransadress: ${escapeHtml(c.street)}, ${escapeHtml(c.zip)} ${escapeHtml(c.city)}</p>
<p>Frågor? Svara på det här mejlet.</p><p>Hälsningar,<br>Cutie Poppers</p>`;
  return { subject: `Tack för din beställning ${order.number}`, text, html };
}

/** Send through Resend. Returns true on success. In dry-run mode only logs. */
export async function sendEmail(env, fetchFn, message) {
  if (env.EMAIL_DRY_RUN === "true") {
    console.log(`[email dry-run] to=${message.to} subject=${message.subject}`);
    return true;
  }
  const res = await fetchFn("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM || "Cutie Poppers <onboarding@resend.dev>",
      to: [message.to],
      reply_to: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  if (!res.ok) {
    console.error(`Resend error ${res.status}: ${await res.text()}`);
    return false;
  }
  return true;
}
