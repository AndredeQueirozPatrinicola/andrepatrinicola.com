import { expect, test } from "@playwright/test";

const pages = [
  { path: "/pt", h1: "André de Queiroz Patrinicola", lang: "pt-BR" },
  { path: "/en/games", h1: "Games", lang: "en" },
  { path: "/es/games/meteor", h1: "Spaceship Meteor", lang: "es" },
  { path: "/en/labs", h1: "Labs", lang: "en" },
  { path: "/pt/about", h1: "Sobre", lang: "pt-BR" },
  { path: "/es/resume", h1: "Currículum", lang: "es" },
];

for (const { path, h1, lang } of pages) {
  test(`${path} opens directly, survives a reload and is localized`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText(h1);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);

    await page.reload();
    await expect(page.locator("h1")).toHaveText(h1);
  });
}

test("serves pre-rendered HTML with page metadata", async ({ request }) => {
  const html = await (await request.get("/en/games/pong")).text();

  expect(html).toContain("<title>Classic Pong · André Patrinicola</title>");
  expect(html).toContain('rel="canonical"');
  expect(html).toMatch(/hrefLang="es" href="[^"]+\/es\/games\/pong"/);
  expect(html).toContain('"@type":"VideoGame"');
  expect(html).toContain("Score 5 points before the computer does.");
});

test("unknown URLs answer a real 404 page", async ({ page }) => {
  const response = await page.goto("/pt/nothing-here");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/es");
});

test("trailing slashes redirect to the canonical URL", async ({ page }) => {
  await page.goto("/en/resume/");
  expect(new URL(page.url()).pathname).toBe("/en/resume");
});

test("sitemap and robots are published", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap.match(/<url>/g)).toHaveLength(30);
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap:");
});
