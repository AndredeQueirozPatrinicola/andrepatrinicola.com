import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

// The build used by the tests points the assistant here (see .github/workflows/ci.yml).
const API = "https://api.example.test/ai/chat";
const sessionToken = "t".repeat(43);

async function stubTurnstile(page: Page) {
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `let options;
      window.turnstile = {
        render: (element, renderOptions) => { options = renderOptions; setTimeout(() => options.callback("test-token")); return "widget"; },
        reset: () => setTimeout(() => options.callback("test-token-2")),
        remove: () => {},
      };`,
    }),
  );
}

function answer(status: number, body: unknown) {
  return (route: Route) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test.beforeEach(async ({ page }) => {
  // The consent banner hides the button on small screens: answer it first.
  await page.addInitScript(() => localStorage.setItem("analytics-consent", "denied"));
  await stubTurnstile(page);
});

test("a closed chat sends nothing and loads no extra script", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(API) || request.url().includes("challenges.cloudflare.com")) calls.push(request.url());
  });
  await page.goto("/en");
  await expect(page.getByRole("button", { name: "Ask the portfolio assistant" })).toBeVisible();
  await page.waitForTimeout(500);
  expect(calls).toEqual([]);
});

test("answers with links to the site and keeps the conversation while browsing", async ({ page }) => {
  const requests: unknown[] = [];
  await page.route(API, async (route) => {
    requests.push(route.request().postDataJSON());
    await answer(200, {
      answer: "The site runs on **AWS Lambda** and API Gateway.\n\n- Contact form\n- Blog CMS",
      sources: [{ title: "Labs: andrepatrinicola.com", url: `${new URL(page.url()).origin}/en/labs#lab-andrepatrinicola-com`, type: "project" }],
      sessionToken,
      remaining: 9,
      fallback: false,
    })(route);
  });

  await page.goto("/en");
  await page.getByRole("button", { name: "Ask the portfolio assistant" }).click();
  const panel = page.getByRole("dialog", { name: "Portfolio assistant" });
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "Which projects show AWS experience?" }).click();

  await expect(panel.getByText("AWS Lambda")).toBeVisible();
  await expect(panel.getByRole("listitem").filter({ hasText: /^Blog CMS$/ })).toBeVisible();
  expect(requests).toEqual([{ message: "Which projects show AWS experience?", locale: "en", turnstileToken: "test-token" }]);

  await panel.getByRole("link", { name: "Labs: andrepatrinicola.com" }).click();
  await expect(page).toHaveURL(/\/en\/labs#lab-andrepatrinicola-com$/);
  await expect(panel.getByText("AWS Lambda")).toBeVisible();
});

test("works with the keyboard only", async ({ page }) => {
  await page.route(API, answer(200, { answer: "Use the About page.", sources: [], sessionToken, remaining: 9, fallback: true }));
  await page.goto("/es");
  const launcher = page.getByRole("button", { name: "Preguntar al asistente del portafolio" });
  await launcher.focus();
  await page.keyboard.press("Enter");
  const input = page.getByRole("textbox", { name: "Tu pregunta" });
  await expect(input).toBeFocused();
  await input.fill("¿Cómo contacto a André?");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Use the About page.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(launcher).toBeFocused();
});

test("explains limits and keeps the question to try again", async ({ page }) => {
  await page.route(API, answer(429, { error: "rate_limited", retryAfter: 30 }));
  await page.goto("/pt");
  await page.getByRole("button", { name: "Perguntar ao assistente do portfólio" }).click();
  const input = page.getByRole("textbox", { name: "Sua pergunta" });
  await input.fill("Quais tecnologias?");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Muitas perguntas em pouco tempo. Aguarde um minuto e tente de novo.")).toBeVisible();
  await expect(input).toHaveValue("Quais tecnologias?");
});

test("fits small screens without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/pt");
  await page.getByRole("button", { name: "Perguntar ao assistente do portfólio" }).click();
  const box = (await page.getByRole("dialog").boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test("does not cover the game player's controls", async ({ page }) => {
  await page.goto("/en/games/pong");
  const launcher = (await page.getByRole("button", { name: "Ask the portfolio assistant" }).boundingBox())!;
  const start = (await page.getByRole("button", { name: /Play/ }).first().boundingBox())!;
  const overlaps = launcher.x < start.x + start.width && launcher.x + launcher.width > start.x && launcher.y < start.y + start.height && launcher.y + launcher.height > start.y;
  expect(overlaps).toBe(false);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`the open panel has no serious accessibility violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.route(API, answer(200, { answer: "Answer **text**.", sources: [], sessionToken, remaining: 9, fallback: true }));
    await page.goto("/en/about");
    await page.getByRole("button", { name: "Ask the portfolio assistant" }).click();
    await page.getByRole("textbox", { name: "Your question" }).fill("Hi");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Answer")).toBeVisible();
    const results = await new AxeBuilder({ page }).include("#assistant-panel").analyze();
    const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
    expect(serious.map((violation) => violation.id)).toEqual([]);
  });
}
