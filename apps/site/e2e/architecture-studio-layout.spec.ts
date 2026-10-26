import { expect, test } from "@playwright/test";

// Runs in the desktop and the mobile project (file name matches /layout/).

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("analytics-consent", "denied"));
});

test("the editor fills the window below the site header without page scroll", async ({ page }) => {
  await page.goto("/en/labs/architecture-studio?template=portfolio");
  await expect(page.locator(".react-flow__node").first()).toBeVisible();
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
  expect(overflow.x).toBeLessThanOrEqual(0);
  expect(overflow.y).toBeLessThanOrEqual(1);
  // The site's own navigation stays available.
  await expect(page.locator(".site-header")).toBeVisible();

  const canvas = await page.locator(".studio-canvas").boundingBox();
  const viewport = page.viewportSize()!;
  // The canvas keeps most of the screen, even on a phone.
  expect(canvas!.width).toBeGreaterThan(viewport.width * 0.5);
  expect(canvas!.height).toBeGreaterThan(viewport.height * 0.4);
});

test("panels open as drawers on small screens and the diagram stays usable", async ({ page, isMobile }) => {
  await page.goto("/en/labs/architecture-studio?new=1");
  await expect(page).toHaveURL(/diagram=/);
  const palette = page.getByRole("complementary", { name: "Components" });
  if (isMobile) {
    await expect(palette).toBeHidden();
    await page.getByRole("button", { name: "Components", exact: true }).click();
  }
  await page.getByRole("button", { name: "Add Amazon S3 to the diagram" }).click();
  if (isMobile) await palette.getByRole("button", { name: "Close panel" }).click();
  await expect(page.locator(".react-flow__node").filter({ hasText: "S3" })).toBeVisible();

  await page.locator(".react-flow__node").filter({ hasText: "S3" }).click();
  if (isMobile) await page.getByRole("button", { name: "Properties", exact: true }).click();
  await page.getByRole("complementary", { name: "Properties" }).getByLabel("Name", { exact: true }).fill("Uploads");
  await expect(page.locator(".react-flow__node").filter({ hasText: "Uploads" })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the start page has no horizontal overflow", async ({ page }) => {
  await page.goto("/pt/labs/architecture-studio");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
