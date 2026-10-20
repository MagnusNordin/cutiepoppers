import { describe, expect, it } from "vitest";
import { SHOP } from "../../src/js/lib/catalog.js";
import { customerEmail, escapeHtml, ownerEmail } from "../../worker/email.js";

const order = {
  number: "CP-2610-ABCD",
  customer: {
    name: "Anna <b>Andersson</b>",
    phone: "070-123 45 67",
    email: "anna@example.se",
    street: "Storgatan 1",
    zip: "123 45",
    city: "Huddinge",
    message: "Present\ntill Lisa",
  },
  items: [
    { name: "Krabba", kindLabel: "Örhängen", options: "Röd · guldkrok", qty: 2, totalOre: 10000 },
    { name: "Kaffe", kindLabel: "Nyckelring", options: "Svart", qty: 1, totalOre: 3000 },
  ],
  subtotalOre: 13000,
};

describe("escapeHtml", () => {
  it("escapes markup characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

describe("owner e-mail", () => {
  const mail = ownerEmail(order);

  it("has a subject with the order number and total", () => {
    expect(mail.subject).toBe("Ny beställning CP-2610-ABCD – 130 kr + frakt");
  });

  it("lists lines, the shipping reminder and the customer in plain text", () => {
    expect(mail.text).toContain("• Krabba – Örhängen × 2 – Röd · guldkrok – 100 kr");
    expect(mail.text).toContain("• Kaffe – Nyckelring – Svart – 30 kr");
    expect(mail.text).toContain("lägg till PostNord-frakt");
    expect(mail.text).toContain("Adress: Storgatan 1, 123 45 Huddinge");
    expect(mail.text).toContain("Meddelande: Present\ntill Lisa");
  });

  it("escapes customer input in HTML", () => {
    expect(mail.html).toContain("Anna &lt;b&gt;Andersson&lt;/b&gt;");
    expect(mail.html).not.toContain("<b>Andersson</b>");
    expect(mail.html).toContain("Present<br>till Lisa");
  });

  it("shows a dash when there is no message", () => {
    const m = ownerEmail({ ...order, customer: { ...order.customer, message: "" } });
    expect(m.text).toContain("Meddelande: –");
    expect(m.html).toContain("Meddelande: –");
  });
});

describe("customer e-mail", () => {
  it("thanks the customer and explains the next steps", () => {
    const mail = customerEmail(order, SHOP);
    expect(mail.subject).toBe("Tack för din beställning CP-2610-ABCD");
    expect(mail.text).toContain("Swish-förfrågan till 070-123 45 67");
    expect(mail.text).toContain("inom 3–4 arbetsdagar");
    expect(mail.html).toContain("<strong>CP-2610-ABCD</strong>");
  });
});
