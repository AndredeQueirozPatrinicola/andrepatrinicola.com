import { expect, test } from "@playwright/test";

test.describe("language entry point", () => {
  test.use({ locale: "es-MX" });

  test("/ sends visitors to their browser language", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/es");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });

  test("an explicit choice wins over the browser language", async ({ page }) => {
    await page.goto("/es");
    await page.getByRole("link", { name: /English/ }).click();
    await page.waitForURL("**/en");

    await page.goto("/");
    await page.waitForURL("**/en");
  });
});

test("client-side navigation keeps history working", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Games" }).click();
  await expect(page).toHaveURL(/\/en\/games$/);
  await expect(page.locator("h1")).toHaveText("Games");

  await page.getByRole("link", { name: /Flappy Thing/ }).first().click();
  await expect(page.locator("h1")).toHaveText("Flappy Thing");

  await page.goBack();
  await expect(page.locator("h1")).toHaveText("Games");
  await page.goForward();
  await expect(page.locator("h1")).toHaveText("Flappy Thing");
});

test("switching language keeps the page and translates its content", async ({ page }) => {
  await page.goto("/en/games/pong");
  await page.getByRole("link", { name: /Português/ }).click();

  await expect(page).toHaveURL(/\/pt\/games\/pong$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByText("Faça 5 pontos antes do computador.")).toBeVisible();
  await expect(page).toHaveTitle("Classic Pong · André Patrinicola");
});
