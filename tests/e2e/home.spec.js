import { expect, test } from "@playwright/test";

test.describe("start page", () => {
  test("shows the hero and all 36 motifs behind 'Visa alla'", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Cutie Poppers/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Örhängen med personlighet");
    const cards = page.locator("[data-grid] .product-card");
    await expect(cards).toHaveCount(36);
    await expect(cards.filter({ visible: true })).toHaveCount(12);
    await page.getByRole("button", { name: "Visa alla 36 motiv" }).click();
    await expect(cards.filter({ visible: true })).toHaveCount(36);
  });

  test("lists the ten colours and both hooks", async ({ page }) => {
    await page.goto("/");
    const explainer = page.locator(".explainer");
    await expect(explainer.locator(".swatch-list li")).toHaveCount(10);
    await expect(explainer.getByText("Guld", { exact: true })).toBeVisible();
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("all products and prices are readable", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-grid] .product-card").filter({ visible: true })).toHaveCount(36);
    await expect(page.getByText("Örhängen 50 kr")).toBeVisible();
  });
});
