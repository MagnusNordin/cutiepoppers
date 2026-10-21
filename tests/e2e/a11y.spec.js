import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/motiv/krabba/",
  "/motiv/basketbollsdribblare/",
  "/kategori/marint/",
  "/varukorg/",
  "/bestallning/",
  "/tack/",
  "/kontakt/",
  "/kopvillkor/",
  "/404.html",
];

test.beforeEach(async ({ context }) => {
  await context.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({ contentType: "text/javascript", body: "" }),
  );
});

for (const path of PAGES) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact));
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}

test("the cart with items has no serious violations", async ({ page }) => {
  await page.goto("/motiv/krabba/");
  await page.getByRole("button", { name: /Lägg i varukorgen/ }).click();
  await page.goto("/varukorg/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => v.id)).toEqual([]);
});

test("the purchase flow works with the keyboard only", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "WebKit does not tab to links by default");
  await page.goto("/motiv/krabba/");
  const cta = page.getByRole("button", { name: /Lägg i varukorgen/ });
  await cta.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-cart-count]")).toHaveText("1");
  await page.goto("/varukorg/");
  await page.getByRole("link", { name: "Till beställning" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/bestallning\//);
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});
