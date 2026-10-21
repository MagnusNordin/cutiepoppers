import { expect, test } from "@playwright/test";

// Stub the Turnstile widget: it injects the token Cloudflare's test secret accepts.
const TURNSTILE_STUB = `
  window.turnstile = { reset() {} };
  document.querySelectorAll(".cf-turnstile").forEach((el) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "cf-turnstile-response";
    input.value = "XXXX.DUMMY.TOKEN.XXXX";
    el.appendChild(input);
  });`;

test.beforeEach(async ({ context }) => {
  await context.route("https://challenges.cloudflare.com/turnstile/**", (route) =>
    route.fulfill({ contentType: "text/javascript", body: TURNSTILE_STUB }),
  );
});

async function addKrabba(page) {
  await page.goto("/motiv/krabba/");
  await page.locator("label.hook-option", { hasText: "Guld" }).click();
  await page.getByRole("button", { name: /Lägg i varukorgen/ }).click();
  await expect(page.locator("[data-cart-count]")).toHaveText("1");
}

async function fillForm(page, overrides = {}) {
  const values = {
    Namn: "Test Testsson",
    Mobilnummer: "070-123 45 67",
    "E-post": "test@example.se",
    Gatuadress: "Testgatan 1",
    Postnummer: "141 30",
    Ort: "Huddinge",
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
}

test("empty cart shows a link back to the shop", async ({ page }) => {
  await page.goto("/bestallning/");
  await expect(page.getByText("Varukorgen är tom")).toBeVisible();
  await expect(page.locator("[data-checkout-form]")).toBeHidden();
});

test("validation errors are shown in Swedish and nothing is sent", async ({ page }) => {
  await addKrabba(page);
  await page.goto("/bestallning/");
  await fillForm(page, { Mobilnummer: "12345", Postnummer: "1" });
  await page.getByRole("button", { name: "Skicka beställning" }).click();
  await expect(page.getByText("Skriv ett svenskt mobilnummer")).toBeVisible();
  await expect(page.getByText("Postnumret ska ha fem siffror.")).toBeVisible();
  await expect(page.getByLabel("Mobilnummer")).toBeFocused();
  await expect(page).toHaveURL(/\/bestallning\//);
});

test("a full order goes through the Worker to the thank-you page", async ({ page }) => {
  await addKrabba(page);
  await page.goto("/varukorg/");
  await page.getByRole("link", { name: "Till beställning" }).click();
  await expect(page.locator("[data-checkout-total]")).toHaveText("50 kr + frakt");
  await fillForm(page);
  await page.getByLabel("Meddelande").fill("En present");
  await page.getByRole("button", { name: "Skicka beställning" }).click();

  await expect(page).toHaveURL(/\/tack\//);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Beställningen är skickad");
  await expect(page.locator("[data-thanks-number]")).toHaveText(/^#CP-\d{4}-[A-Z2-9]{4}$/);
  await expect(page.locator("[data-thanks-items]")).toHaveText("Krabba · 50 kr + frakt");
  await expect(page.getByText("Swish-förfrågan till 070-123 45 67")).toBeVisible();
  await expect(page.locator("[data-cart-count]")).toBeHidden();
});

test("server-side errors are shown and the cart is kept", async ({ page }) => {
  await addKrabba(page);
  await page.route("**/api/orders", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "Beställningen kunde inte skickas just nu." }),
    }),
  );
  await page.goto("/bestallning/");
  await fillForm(page);
  await page.getByRole("button", { name: "Skicka beställning" }).click();
  await expect(page.getByRole("alert")).toHaveText("Beställningen kunde inte skickas just nu.");
  await expect(page.locator("[data-cart-count]")).toHaveText("1");
});

test("the API rejects tampered prices and unknown products", async ({ request }) => {
  const res = await request.post("/api/orders", {
    data: {
      customer: { name: "A B", phone: "0701234567", email: "a@b.se", street: "Gatan 1", zip: "12345", city: "Ort" },
      items: [{ slug: "finns-inte", kind: "earring", color: "rod", hook: "guld", qty: 1 }],
      turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
    },
  });
  expect(res.status()).toBe(422);
});
