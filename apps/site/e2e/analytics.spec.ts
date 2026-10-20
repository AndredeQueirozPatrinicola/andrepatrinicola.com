import { expect, test, type Page } from "@playwright/test";

type TrackedEvent = { name: string; data?: Record<string, string> };

const UMAMI_SCRIPT = 'script[src="https://cloud.umami.is/script.js"]';

test.beforeEach(async ({ page }) => {
  await page.route("https://cloud.umami.is/script.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "window.__events = []; window.umami = { track: (name, data) => window.__events.push({ name, data }) };",
    }),
  );
});

async function grantConsent(page: Page) {
  await page.addInitScript(() => localStorage.setItem("analytics-consent", "granted"));
}

async function stayOnPage(page: Page) {
  await page.evaluate(() =>
    document.addEventListener("click", (event) => {
      if ((event.target as Element).closest("a[href^='http'], a[href^='mailto:'], a[download]")) {
        event.preventDefault();
      }
    }),
  );
}

function events(page: Page) {
  return page.evaluate(() => (window as unknown as { __events: TrackedEvent[] }).__events);
}

test("asks before loading Umami and remembers the answer", async ({ page }) => {
  await page.goto("/en");
  const banner = page.getByRole("region", { name: "Cookies and analytics" });
  await expect(banner).toBeVisible();
  await expect(page.locator(UMAMI_SCRIPT)).toHaveCount(0);

  await banner.getByRole("button", { name: "Decline" }).click();
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(page.locator(UMAMI_SCRIPT)).toHaveCount(0);
  await expect(banner).toBeHidden();

  await page.getByRole("button", { name: "Cookies and analytics" }).click();
  await banner.getByRole("button", { name: "Accept" }).click();
  await expect(banner).toBeHidden();
  await expect(page.locator(UMAMI_SCRIPT)).toHaveCount(1);
  await page.reload();
  await expect(page.locator(UMAMI_SCRIPT)).toHaveCount(1);
  await expect(banner).toBeHidden();
});

test("loads Umami only for the production domains", async ({ page }) => {
  await grantConsent(page);
  await page.goto("/pt");
  const script = page.locator(UMAMI_SCRIPT);

  await expect(script).toHaveAttribute("data-website-id", "29383e2e-4db5-4448-a8b3-1d1155985516");
  await expect(script).toHaveAttribute("data-domains", /(^|,)andrepatrinicola\.com\.br(,|$)/);
  await expect(script).not.toHaveAttribute("data-domains", /localhost/);
});

test("tracks playing a game and the player toolbar", async ({ page }) => {
  await grantConsent(page);
  await page.goto("/en/games/pong");
  await page.getByRole("button", { name: "Play: Classic Pong" }).click();
  await page.getByRole("button", { name: "Restart" }).click();

  await expect.poll(() => events(page)).toEqual([
    { name: "game-play", data: { game: "pong", hosting: "embedded" } },
    { name: "game-restart", data: { game: "pong" } },
  ]);
});

test("tracks contact links with where they were clicked", async ({ page }) => {
  await grantConsent(page);
  await page.goto("/en/about");
  await stayOnPage(page);
  await page.locator(".about-links").getByRole("link", { name: "LinkedIn" }).click();
  await page.locator(".site-footer").getByRole("link", { name: "andrepatrinicola@gmail.com" }).click();

  await expect.poll(() => events(page)).toEqual([
    { name: "contact", data: { channel: "linkedin", location: "about" } },
    { name: "contact", data: { channel: "email", location: "footer" } },
  ]);
});

test("tracks résumé downloads and skill highlights", async ({ page }) => {
  await grantConsent(page);
  await page.goto("/en/resume");
  await stayOnPage(page);
  await page.getByRole("link", { name: "PDF in English" }).click();
  await page.getByRole("button", { name: "PHP" }).click();
  await page.getByRole("button", { name: "PHP" }).click();

  await expect.poll(() => events(page)).toEqual([
    { name: "resume-download", data: { language: "en" } },
    { name: "skill-highlight", data: { skill: expect.any(String) } },
  ]);
});

test("tracks language and theme changes without breaking navigation", async ({ page }) => {
  await grantConsent(page);
  await page.goto("/pt/games");
  await page.getByRole("link", { name: /^EN/ }).click();
  await expect(page).toHaveURL(/\/en\/games$/);
  await page.getByRole("radio", { name: "Dark" }).check({ force: true });

  await expect.poll(() => events(page)).toEqual([
    { name: "language-change", data: { from: "pt", to: "en" } },
    { name: "theme-change", data: { theme: "dark" } },
  ]);
});
