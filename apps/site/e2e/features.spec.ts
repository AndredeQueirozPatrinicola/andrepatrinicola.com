import { expect, test } from "@playwright/test";

test("theme choice persists and is applied before the page renders", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("radio", { name: "Dark" }).check({ force: true });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload({ waitUntil: "commit" });
  // Read as soon as the document exists: the inline script must already have run.
  await page.waitForSelector("body", { state: "attached" });
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
});

test("a game loads only after Play and receives focus", async ({ page }) => {
  await page.goto("/en/games/pong");
  await expect(page.locator("iframe")).toHaveCount(0);

  await page.getByRole("button", { name: "Play: Classic Pong" }).click();
  const frame = page.locator('iframe[title="Classic Pong"]');
  await expect(frame).toHaveAttribute("src", "/play/pong/index.html");
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe("IFRAME");
});

test("the home playfield can be taken over with the keyboard", async ({ page }) => {
  await page.goto("/en");
  const play = page.getByRole("button", { name: "Play" });
  await play.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Stop" })).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Play" })).toHaveAttribute("aria-pressed", "false");
});

test("the résumé highlights where a skill is used", async ({ page }) => {
  await page.goto("/en/resume");
  await page.getByRole("button", { name: "PHP" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Highlighting: PHP" })).toBeVisible();
  await expect(page.locator('.timeline-item[data-match="true"]')).toHaveCount(1);
  await expect(page.locator('.timeline-item[data-match="true"] h3')).toContainText("STI");
});

test("the home animation can be paused", async ({ page }) => {
  await page.goto("/en");
  // Compares the canvas pixels only (the HUD around it may still blink).
  const frame = () => page.locator(".playfield-canvas").evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: "Pause animation" }).click();
  await expect(page.getByRole("button", { name: "Resume animation" })).toHaveAttribute("aria-pressed", "true");
  const before = await frame();
  await page.waitForTimeout(400);
  expect(await frame()).toBe(before);
});

test("clearing the résumé highlight returns focus to the chosen skill", async ({ page }) => {
  await page.goto("/en/resume");
  await page.getByRole("button", { name: "Django" }).click();
  await page.getByRole("button", { name: "Clear highlight" }).click();
  await expect(page.getByRole("button", { name: "Django" })).toBeFocused();
});
