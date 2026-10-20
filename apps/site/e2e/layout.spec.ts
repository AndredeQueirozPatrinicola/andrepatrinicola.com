import { expect, test } from "@playwright/test";

const paths = ["/pt", "/es/games", "/es/games/meteor", "/en/labs", "/es/about", "/es/resume", "/en/404"];

for (const path of paths) {
  test(`${path} has no horizontal overflow`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
