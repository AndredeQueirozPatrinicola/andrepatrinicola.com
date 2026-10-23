import { expect, test } from "@playwright/test";

// Runs against a build of the fixture snapshot (e2e/fixtures/blog-snapshot.json),
// as in CI: CONTENT_SNAPSHOT=apps/site/e2e/fixtures/blog-snapshot.json npm run build
const post = "/pt/blog/arquitetura-serverless-do-portfolio";
const translation = "/en/blog/portfolio-serverless-architecture";

test("lists the posts of one language with a type filter", async ({ page }) => {
  await page.goto("/pt/blog");
  await expect(page.locator("h1")).toHaveText("Blog");
  const titles = page.locator(".blog-card-title");
  await expect(titles).toHaveText(["Diário de bordo: o editor do CMS", "Arquitetura serverless do portfólio"]);

  await page.getByRole("button", { name: "Build logs" }).click();
  await expect(titles).toHaveText(["Diário de bordo: o editor do CMS"]);
  await expect(page.getByRole("button", { name: "Build logs" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Tudo" }).click();
  await expect(titles).toHaveCount(2);
});

test("the home page shows the latest posts and opens them", async ({ page }) => {
  await page.goto("/pt");
  const section = page.getByRole("region", { name: "Últimos posts" });
  const titles = section.getByRole("heading", { level: 3 });
  await expect(titles).toHaveText(["Diário de bordo: o editor do CMS", "Arquitetura serverless do portfólio"]);
  await section.getByRole("link", { name: "Arquitetura serverless do portfólio" }).click();
  await expect(page).toHaveURL(/\/pt\/blog\/arquitetura-serverless-do-portfolio$/);

  // No posts in a language, no section.
  await page.goto("/es");
  await expect(page.getByRole("region", { name: "Últimas publicaciones" })).toHaveCount(0);
});

test("a language without posts says so", async ({ page }) => {
  await page.goto("/es/blog");
  await expect(page.getByText("Todavía no hay publicaciones en este idioma.")).toBeVisible();
});

test("opens a post from the list with client-side navigation", async ({ page }) => {
  await page.goto("/pt/blog");
  await page.getByRole("link", { name: "Arquitetura serverless do portfólio" }).click();
  await expect(page).toHaveURL(post);
  await expect(page.locator("h1")).toHaveText("Arquitetura serverless do portfólio");
  await page.goBack();
  await expect(page).toHaveURL("/pt/blog");
});

test("renders the article body from the structured document", async ({ page }) => {
  const response = await page.goto(post);
  expect(response?.status()).toBe(200);

  const body = page.locator(".article-content");
  await expect(body.getByRole("heading", { level: 2, name: "Por que manter o site estático?" })).toHaveAttribute(
    "id",
    "por-que-manter-o-site-estatico",
  );
  await expect(body.getByRole("link", { name: "documentação do React Router" })).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  // The unsafe link of the fixture is plain text.
  await expect(body.getByText("não clique")).toBeVisible();
  await expect(body.getByRole("link", { name: "não clique" })).toHaveCount(0);
  await expect(body.locator("pre .hljs-keyword").first()).toHaveText("import");
  await expect(body.getByRole("figure")).toContainText("Do painel ao CloudFront");
  await expect(body.getByRole("img", { name: "Diagrama da publicação" })).toHaveJSProperty("complete", true);
  await expect(page.getByText("10 de outubro de 2026")).toBeVisible();
});

test("publishes SEO metadata for the languages that exist", async ({ request }) => {
  const html = await (await request.get(post)).text();

  expect(html).toContain("<title>Arquitetura serverless do portfólio · André Patrinicola</title>");
  expect(html).toMatch(/rel="canonical" href="[^"]+\/pt\/blog\/arquitetura-serverless-do-portfolio"/);
  expect(html).toMatch(/hrefLang="en" href="[^"]+\/en\/blog\/portfolio-serverless-architecture"/);
  expect(html).not.toMatch(/<link rel="alternate" hrefLang="es"/);
  expect(html).toContain('<meta property="og:type" content="article"/>');
  expect(html).toContain('<meta property="article:published_time" content="2026-10-10T12:00:00.000Z"/>');
  expect(html).toContain('"@type":"BlogPosting"');
  expect(html).toContain('type="application/rss+xml"');
});

test("switches to the translated slug, or to the blog when there is no translation", async ({ page }) => {
  await page.goto(post);
  const switcher = page.getByRole("navigation", { name: "Idioma" });
  await expect(switcher.getByRole("link", { name: /Español/ })).toHaveAttribute("href", "/es/blog");
  await expect(page.locator(".blog-post-languages").getByRole("link")).toHaveText(["English"]);

  await switcher.getByRole("link", { name: /English/ }).click();
  await expect(page).toHaveURL(translation);
  await expect(page.locator("h1")).toHaveText("The portfolio's serverless architecture");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("an earlier slug redirects to the current one", async ({ page, request }) => {
  const html = await (await request.get("/pt/blog/arquitetura-do-portfolio")).text();
  expect(html).toContain('<meta http-equiv="refresh" content="0;url=/pt/blog/arquitetura-serverless-do-portfolio">');
  expect(html).toContain('<meta name="robots" content="noindex">');

  await page.goto("/pt/blog/arquitetura-do-portfolio");
  await expect(page).toHaveURL(post);
});

test("unknown posts answer 404", async ({ page }) => {
  const response = await page.goto("/pt/blog/nao-existe");
  expect(response?.status()).toBe(404);
});

test("publishes an RSS feed per language", async ({ request }) => {
  const response = await request.get("/pt/blog/rss.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("xml");
  const xml = await response.text();
  expect(xml).toContain('<rss version="2.0"');
  expect(xml.match(/<item>/g)).toHaveLength(2);
  expect(xml).toContain("três idiomas &amp; &lt;tags&gt;.");
});

test("lists posts in the sitemap and keeps the admin out of robots", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/en/blog/portfolio-serverless-architecture</loc>");
  expect(sitemap).toContain("/es/blog</loc>");
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /admin");
});

test("serves the re-encoded images", async ({ request }) => {
  const response = await request.get("/media/8f1c2b4e-6a0d-4c1e-9b7a-2d3e4f5a6b7c-480.webp");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/webp");
});

test("link previews use a JPEG", async ({ request }) => {
  const html = await (await request.get("/pt/blog/arquitetura-serverless-do-portfolio")).text();
  const image = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
  expect(image).toMatch(/\/media\/8f1c2b4e-6a0d-4c1e-9b7a-2d3e4f5a6b7c-share\.jpg$/);
  const response = await request.get(new URL(image!).pathname);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/jpeg");
});
