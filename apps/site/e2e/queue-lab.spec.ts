import { readdirSync, readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

test.describe("Distributed Systems Playground", () => {
  test("is pre-rendered with its own title, description and hreflang", async ({ request }) => {
    const html = await (await request.get("/es/labs/distributed-systems")).text();
    expect(html).toContain("<title>Distributed Systems Playground · André Patrinicola</title>");
    expect(html).toContain('hrefLang="pt-BR" href="');
    expect(html).toContain("/pt/labs/distributed-systems");
    expect(html).toContain("Simulation Mode");
    expect(await (await request.get("/sitemap.xml")).text()).toContain("/en/labs/distributed-systems");
  });

  test("is reached from the Labs page", async ({ page }) => {
    await page.goto("/en/labs");
    await page.getByRole("article", { name: "Distributed Systems Playground" }).getByRole("link", { name: "Open the lab" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Distributed Systems Playground" })).toBeVisible();
    await expect(page).toHaveURL(/\/en\/labs\/distributed-systems$/);
  });

  test("runs a scenario to the end in the browser, without calling any API", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.hostname !== "localhost") requests.push(request.url());
    });
    await page.goto("/en/labs/distributed-systems");
    await page.getByRole("radio", { name: /Poison Message/ }).check({ force: true });
    await page.getByRole("group", { name: "Speed" }).getByText("4×").click();
    await page.getByRole("button", { name: "Start", exact: true }).click();

    await expect(page.getByRole("status").filter({ hasText: "Finished" })).toContainText("5 processed, 1 in the DLQ", { timeout: 15_000 });
    await expect(page.locator('[data-metric="dlq"] dd')).toHaveText("1");
    await expect(page.getByText(/moved to the DLQ after 3 receives/)).toBeVisible();
    expect(requests.filter((url) => /example\.test|amazonaws|execute-api/.test(url))).toEqual([]);
  });

  test("the public page's code knows nothing of the admin API", async ({ page }) => {
    const assets = new URL("../build/client/assets/", import.meta.url);
    const publicChunks = readdirSync(assets).filter((name) => /^(lab-distributed-systems|queue-lab)-.*\.js$/.test(name));
    expect(publicChunks.length).toBeGreaterThan(0);
    for (const name of publicChunks) {
      const code = readFileSync(new URL(name, assets), "utf8");
      expect(code).not.toContain("/admin/labs");
      expect(code).not.toContain("studio-api.example.test");
    }
    await page.close();
  });

  test("step, pause and reset", async ({ page }) => {
    await page.goto("/pt/labs/distributed-systems");
    await page.getByRole("button", { name: "Próximo evento" }).click();
    await expect(page.locator('[data-metric="sent"] dd')).toHaveText("1");
    await expect(page.getByRole("status").filter({ hasText: "Pausada" })).toBeVisible();
    await page.getByRole("button", { name: "Reiniciar" }).click();
    await expect(page.locator('[data-metric="sent"] dd')).toHaveText("0");
  });

  test("draws tokens without animation when reduced motion is requested", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/labs/distributed-systems");
    await page.getByRole("button", { name: "Next event" }).click();
    const transition = await page.locator(".ql-diagram .ql-token").first().evaluate((node) => getComputedStyle(node).transitionDuration);
    expect(transition).toBe("0s");
  });
});
