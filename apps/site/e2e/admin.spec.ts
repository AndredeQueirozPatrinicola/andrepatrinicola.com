import { readdirSync, readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { AUTH_DOMAIN, CLIENT_ID, fakeStudio, seedArticle, signIn, stubCognito } from "./support/studio";

test.describe("signing in", () => {
  test("an anonymous visit goes to Cognito with PKCE and comes back to the page", async ({ page, baseURL }) => {
    let tokenRequest: URLSearchParams | undefined;
    await stubCognito(page, (body) => {
      tokenRequest = body;
    });
    const fake = await fakeStudio(page);
    seedArticle(fake);

    let authorize: URL | undefined;
    await page.route(`${AUTH_DOMAIN}/oauth2/authorize**`, async (route) => {
      authorize = new URL(route.request().url());
      // Cognito would show its login page; answer as if the user signed in.
      const back = new URL(authorize.searchParams.get("redirect_uri")!);
      back.searchParams.set("code", "authorization-code");
      back.searchParams.set("state", authorize.searchParams.get("state")!);
      await route.fulfill({ status: 302, headers: { location: back.toString() } });
    });

    await page.goto("/admin/articles?status=draft");

    await expect(page.getByRole("heading", { name: "Artigos", level: 1 })).toBeVisible();
    expect(page.url()).toBe(`${baseURL}/admin/articles?status=draft`);
    expect(authorize?.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(authorize?.searchParams.get("response_type")).toBe("code");
    expect(authorize?.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorize?.searchParams.get("code_challenge")).toMatch(/^[\w-]{43}$/);
    expect(authorize?.searchParams.get("scope")).toContain("portfolio-studio/admin");
    expect(authorize?.searchParams.get("redirect_uri")).toBe(`${baseURL}/admin/callback`);
    expect(tokenRequest?.get("grant_type")).toBe("authorization_code");
    expect(tokenRequest?.get("code_verifier")).toMatch(/^[\w-]{43,128}$/);
    expect(tokenRequest?.has("client_secret")).toBe(false);

    // Tokens stay in sessionStorage, never in localStorage.
    const stored = await page.evaluate(() => ({ local: JSON.stringify(localStorage), session: Object.keys(sessionStorage) }));
    expect(stored.local).not.toContain("access_token");
    expect(stored.session.some((key) => key.startsWith("oidc.user:"))).toBe(true);
  });

  test("a build never contains the local mode's simulated login", async ({ page }) => {
    const assets = new URL("../build/client/assets/", import.meta.url);
    const code = readdirSync(assets)
      .filter((name) => name.endsWith(".js"))
      .map((name) => readFileSync(new URL(name, assets), "utf8"))
      .join("\n");
    expect(code).toContain(CLIENT_ID);
    expect(code).not.toContain("admin@localhost");
    expect(code).not.toContain("local-dev");
    await page.close();
  });

  test("the admin shell is never indexed", async ({ page, request }) => {
    const shell = await request.get("/admin/articles");
    expect(shell.status()).toBe(200);
    expect(await shell.text()).toContain('<meta name="robots" content="noindex, nofollow"/>');
    expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /admin");
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/admin");
    await page.close();
  });
});

test.describe("signed in", () => {
  test.beforeEach(async ({ page }) => {
    await stubCognito(page);
    await signIn(page);
  });

  test("dashboard and navigation", async ({ page }) => {
    const fake = await fakeStudio(page);
    seedArticle(fake);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();
    await expect(page.getByText("andre@example.test").first()).toBeVisible();
    await page.getByRole("link", { name: "Artigos" }).first().click();
    await expect(page.getByRole("link", { name: "Arquitetura do Studio" })).toBeVisible();
  });

  test("writes an article with autosave and publishes it after the deploy confirms", async ({ page }) => {
    const fake = await fakeStudio(page);
    await page.goto("/admin/articles/new");
    await page.getByLabel("Título").fill("Eventos na AWS");
    await page.getByRole("button", { name: "Criar rascunho" }).click();

    await expect(page.getByLabel("Slug")).toHaveValue("eventos-na-aws");
    await page.getByRole("textbox", { name: /^Resumo/ }).fill("Como desacoplei o portfólio.");
    const editor = page.getByRole("textbox", { name: "Corpo do artigo em Português" });
    await editor.click();
    await editor.pressSequentially("Primeiro parágrafo do artigo.");

    // Ready only once every field is filled.
    const ready = page.getByLabel("Versão em Português pronta para publicar");
    await expect(ready).toBeEnabled();
    await ready.check();

    await expect(page.getByText(/Salvo às/)).toBeVisible({ timeout: 10_000 });
    const patches = fake.requests.filter((request) => request.method === "PATCH");
    expect(patches.length).toBeGreaterThan(0);
    const last = patches.at(-1)!.body as { version: number; locales: { pt: { content: unknown; translationStatus: string } } };
    expect(last.locales.pt.translationStatus).toBe("ready");
    expect(JSON.stringify(last.locales.pt.content)).toContain("Primeiro parágrafo do artigo.");

    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(page.getByText("Publicação concluída: o site já está atualizado.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /PT · \/pt\/blog\/eventos-na-aws/ })).toBeVisible();
    const publish = fake.requests.find((request) => request.path.endsWith("/publish"));
    expect(publish?.body).toMatchObject({ locales: ["pt"] });
  });

  test("opening an article changes nothing", async ({ page }) => {
    const fake = await fakeStudio(page);
    const article = seedArticle(fake);
    await page.goto(`/admin/articles/${article.id}/edit`);
    await expect(page.getByRole("textbox", { name: "Corpo do artigo em Português" })).toBeVisible();
    await page.waitForTimeout(2500);
    await expect(page.getByText("Tudo salvo")).toBeVisible();
    expect(fake.requests.filter((request) => request.method === "PATCH")).toEqual([]);
  });

  test("a stale version shows the conflict choice instead of overwriting", async ({ page }) => {
    const fake = await fakeStudio(page);
    const article = seedArticle(fake);
    fake.failNextPatch = true;
    await page.goto(`/admin/articles/${article.id}/edit`);
    await page.getByRole("textbox", { name: /^Resumo/ }).fill("Outro resumo.");
    await expect(page.getByRole("dialog", { name: "Este artigo mudou em outro lugar" })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Manter as minhas alterações" }).click();
    await expect(page.getByText(/Salvo às/)).toBeVisible({ timeout: 10_000 });
  });

  test("warns before leaving with unsaved changes", async ({ page }) => {
    const fake = await fakeStudio(page);
    const article = seedArticle(fake);
    await page.goto(`/admin/articles/${article.id}/edit`);
    await page.getByRole("textbox", { name: /^Resumo/ }).fill("Alteração rápida.");
    await page.getByRole("link", { name: "Mídia" }).click();
    await expect(page.getByRole("dialog", { name: "Sair sem salvar?" })).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/articles/${article.id}/edit$`));
  });

  test("an expired session keeps the page and offers to sign in again", async ({ page }) => {
    const fake = await fakeStudio(page);
    const article = seedArticle(fake);
    await page.goto(`/admin/articles/${article.id}/edit`);
    await expect(page.getByRole("textbox", { name: /^Resumo/ })).toBeVisible();
    fake.expired = true;
    await page.getByRole("textbox", { name: /^Resumo/ }).fill("Texto que não pode se perder.");
    await expect(page.getByText("Sua sessão expirou.")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Sessão expirada: alterações guardadas nesta aba")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("textbox", { name: /^Resumo/ })).toHaveValue("Texto que não pode se perder.");
    const backup = await page.evaluate((id) => sessionStorage.getItem(`studio:unsaved:${id}`), article.id);
    expect(backup).toContain("Texto que não pode se perder.");
  });

  test("uploads an image to the library", async ({ page }) => {
    const fake = await fakeStudio(page);
    await page.goto("/admin/media");
    await page.locator('input[type="file"]').setInputFiles({
      name: "diagram.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"),
    });
    await expect(page.getByRole("button", { name: /diagram/ })).toBeVisible();
    expect(fake.requests.map((request) => `${request.method} ${request.path}`)).toEqual(
      expect.arrayContaining(["POST /admin/media/upload-url", `POST /admin/media/${String(fake.media[0]!.id)}/complete`]),
    );

    // Files the site would never serve are refused before any upload.
    await page.locator('input[type="file"]').setInputFiles({ name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
    await expect(page.getByText("logo.svg: use JPEG, PNG, WebP ou AVIF.")).toBeVisible();
  });

  test("prepares a LinkedIn post by hand when the API is not connected", async ({ page }) => {
    const fake = await fakeStudio(page);
    const now = new Date().toISOString();
    seedArticle(fake, { status: "published", live: { revision: 1, seq: 1, slugs: { pt: "arquitetura-do-studio" }, publishedAt: now, updatedAt: now } });
    await page.goto("/admin/publications");
    await page.getByRole("button", { name: "Novo post" }).click();
    await page.getByLabel("Artigo publicado").selectOption({ label: "Arquitetura do Studio" });
    await page.getByLabel("Idioma do post").selectOption("pt");
    await page.getByRole("button", { name: "Criar rascunho" }).click();

    await expect(page.getByRole("heading", { name: "Arquitetura do Studio", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Aprovar texto" }).click();
    const open = page.getByRole("link", { name: "Abrir o LinkedIn" });
    await expect(open).toHaveAttribute("href", /^https:\/\/www\.linkedin\.com\/feed\/\?shareActive=true&text=Arquitetura/);
    await expect(page.getByText("Integração não configurada.")).toBeVisible();

    await page.getByRole("button", { name: "Registrar como publicado" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Registrar" }).click();
    await expect(page.getByText(/registro manual/)).toBeVisible();
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`admin pages have no serious accessibility violations (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      const fake = await fakeStudio(page);
      const article = seedArticle(fake);
      for (const path of ["/admin", "/admin/articles", `/admin/articles/${article.id}/edit`, "/admin/media", "/admin/publications", "/admin/settings"]) {
        await page.goto(path);
        await expect(page.locator("#admin-content h1").first()).toBeVisible();
        const results = await new AxeBuilder({ page }).analyze();
        const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
        expect(serious.map((violation) => `${path} ${violation.id}: ${violation.nodes.map((node) => node.target).join(", ")}`)).toEqual([]);
      }
    });
  }

  test("admin pages fit a phone screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    const fake = await fakeStudio(page);
    const article = seedArticle(fake);
    for (const path of ["/admin", "/admin/articles", `/admin/articles/${article.id}/edit`, "/admin/publications"]) {
      await page.goto(path);
      await expect(page.locator("#admin-content h1").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("queue lab (AWS Live Mode)", () => {
  test.beforeEach(async ({ page }) => {
    await stubCognito(page);
    await signIn(page);
  });

  test("starts a real run, follows it by polling and stops when it ends", async ({ page }) => {
    const fake = await fakeStudio(page);
    await page.goto("/admin/labs");
    await expect(page.getByRole("heading", { name: "Labs", level: 1 })).toBeVisible();
    await expect(page.getByRole("note").filter({ hasText: "AWS Live Mode" })).toContainText("mensagens reais");

    await page.getByLabel("Mensagens (1 a 10)").fill("4");
    await page.getByLabel("Cenário").selectOption("poison-message");
    await page.getByRole("button", { name: "Executar na AWS" }).click();

    await expect(page.getByText("Concluída")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("img", { name: /Mensagens da execução real/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /m01 poison Na DLQ \(inferido\) 3/ })).toBeVisible();
    expect(fake.requests.filter((request) => request.method === "POST" && request.path === "/admin/labs/queue-runs")).toEqual([
      { method: "POST", path: "/admin/labs/queue-runs", body: { messageCount: 4, failureScenario: "poison-message" } },
    ]);

    const polls = () => fake.requests.filter((request) => request.path.startsWith("/admin/labs/queue-runs/")).length;
    const settled = polls();
    expect(settled).toBe(4);
    await page.waitForTimeout(4500);
    expect(polls()).toBe(settled);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? "")).map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(", ")}`)).toEqual([]);
  });

  test("explains why a run cannot start while the consumer is off", async ({ page }) => {
    const fake = await fakeStudio(page);
    fake.lab.consumerState = "Disabled";
    await page.goto("/admin/labs");
    await expect(page.getByText("Disabled", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Executar na AWS" })).toBeDisabled();
    await expect(page.getByText(/queue_lab_enabled = true/)).toBeVisible();
  });
});
