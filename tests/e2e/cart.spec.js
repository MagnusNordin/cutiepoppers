import { expect, test } from "@playwright/test";

async function addToCart(page, slug, { kind = "Örhängen", color = "Röd", hook = "Silver" } = {}) {
  await page.goto(`/motiv/${slug}/`);
  await page.getByText(kind, { exact: false }).first().click();
  await page.locator(`label.swatch:has-text("${color}")`).click();
  if (kind === "Örhängen") await page.locator(`label.hook-option:has-text("${hook}")`).click();
  await page.getByRole("button", { name: /Lägg i varukorgen/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Tillagd i varukorgen" })).toBeVisible();
}

test.describe("browse", () => {
  test("filter to Marint and open Krabba", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Marint", exact: true }).first().click();
    await expect(page).toHaveURL(/\/kategori\/marint\//);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Marina örhängen");
    await expect(page.locator(".product-card")).toHaveCount(8);
    await page
      .getByRole("link", { name: /Krabba/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/motiv\/krabba\//);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Krabba");
  });
});

test.describe("product options", () => {
  test("earrings show hooks and cost 50 kr, keyrings hide hooks and cost 30 kr", async ({ page }) => {
    await page.goto("/motiv/krabba/");
    const cta = page.getByRole("button", { name: /Lägg i varukorgen/ });
    await expect(cta).toContainText("50 kr");
    await expect(page.getByText("Krok:")).toBeVisible();
    await page.locator("label.kind-option", { hasText: "Nyckelring" }).click();
    await expect(cta).toContainText("30 kr");
    await expect(page.getByText("Krok:")).toBeHidden();
    await page.locator("label.swatch", { hasText: "Blå" }).click();
    await expect(page.locator("legend", { hasText: "Färg" })).toContainText("Blå");
  });
});

test.describe("cart", () => {
  test("add, badge, quantities, remove and persistence", async ({ page }) => {
    await addToCart(page, "krabba", { color: "Röd", hook: "Guld" });
    await expect(page.locator("[data-cart-count]")).toHaveText("1");
    await addToCart(page, "kaffe", { kind: "Nyckelring", color: "Svart" });
    await expect(page.locator("[data-cart-count]")).toHaveText("2");

    await page.goto("/varukorg/");
    const lines = page.locator(".cart-line");
    await expect(lines).toHaveCount(2);
    await expect(lines.first()).toContainText("Röd · guldkrok");
    await expect(page.locator("[data-cart-total]")).toHaveText("80 kr + frakt");

    await page.getByRole("button", { name: "Lägg till en Krabba" }).click();
    await expect(page.locator("[data-cart-total]")).toHaveText("130 kr + frakt");

    await page.reload();
    await expect(lines).toHaveCount(2);
    await expect(page.locator("[data-cart-meta]")).toHaveText("3 varor");

    await page.getByRole("button", { name: "Ta bort Kaffe" }).click();
    await expect(lines).toHaveCount(1);
    await page.getByRole("button", { name: "Ta bort Krabba" }).click();
    await expect(page.getByText("Varukorgen är tom")).toBeVisible();
    await expect(page.locator("[data-cart-count]")).toBeHidden();
  });

  test("syncs the badge across tabs", async ({ page, context }) => {
    await page.goto("/");
    const other = await context.newPage();
    await addToCart(other, "fyr");
    await expect(page.locator("[data-cart-count]")).toHaveText("1");
  });

  test("copies an Instagram order", async ({ page, context, browserName }) => {
    test.skip(browserName === "webkit", "WebKit has no clipboard permission in Playwright");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await context.route("https://ig.me/**", (route) => route.fulfill({ body: "instagram" }));
    await addToCart(page, "hummer", { color: "Orange", hook: "Silver" });
    await page.goto("/varukorg/");
    const popup = context.waitForEvent("page");
    await page.getByRole("button", { name: "Beställ via Instagram istället" }).click();
    await popup;
    await expect(page.getByRole("status").filter({ hasText: "kopierad" })).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain("Hej! Jag vill beställa:");
    expect(text.replace(/\u00a0/g, " ")).toContain("Hummer – Örhängen – Orange · silverkrok – 50 kr");
  });
});

test.describe("gallery", () => {
  test("every image fits inside the square frame, drawings included", async ({ page }) => {
    await page.goto("/motiv/badhytt/");
    await page.getByRole("button", { name: "Visa bild 2 av 2" }).click();
    const frame = await page.locator("[data-gallery-main]").boundingBox();
    const img = await page.locator('[data-gallery-image="1"] img').boundingBox();
    expect(Math.round(frame.width)).toBe(Math.round(frame.height));
    expect(img.height).toBeLessThanOrEqual(frame.height);
    await expect(page.locator('[data-gallery-image="1"] img')).toHaveCSS("object-fit", "contain");
  });
});
