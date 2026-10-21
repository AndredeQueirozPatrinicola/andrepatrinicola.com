import { expect, test, type Page, type Route } from "@playwright/test";

const API = "https://api.example.test/contact";

test.beforeEach(async ({ page }) => {
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `let options;
      window.turnstile = {
        render: (element, renderOptions) => {
          options = renderOptions;
          setTimeout(() => options.callback("test-token"));
          return "widget";
        },
        reset: () => setTimeout(() => options.callback("test-token")),
        remove: () => {},
      };`,
    }),
  );
});

async function fillForm(page: Page) {
  await page.getByLabel("Name").fill("Maria");
  await page.getByLabel("E-mail").fill("maria@example.com");
  await page.getByLabel("Subject").fill("Hello");
  await page.getByLabel("Message").fill("I would like to talk.");
}

function answer(status: number, body: unknown, delay = 0) {
  return async (route: Route) => {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  };
}

test("sends the message with the Turnstile token and blocks double submits", async ({ page }) => {
  const requests: unknown[] = [];
  await page.route(API, async (route) => {
    requests.push(route.request().postDataJSON());
    await answer(200, { status: "sent" }, 300)(route);
  });

  await page.goto("/en/about");
  await fillForm(page);
  const submit = page.getByRole("button", { name: "Send message" });
  await submit.click();

  await expect(page.getByRole("button", { name: "Sending…" })).toBeDisabled();
  await expect(page.getByRole("status").filter({ hasText: "Message sent." })).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveValue("");
  expect(requests).toEqual([
    {
      name: "Maria",
      email: "maria@example.com",
      subject: "Hello",
      message: "I would like to talk.",
      website: "",
      turnstileToken: "test-token",
    },
  ]);
});

test("marks the fields the API rejected", async ({ page }) => {
  await page.route(API, answer(400, { error: "invalid_request", fields: ["email"] }));
  await page.goto("/en/about");
  await fillForm(page);
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByText("Check the highlighted fields.")).toBeVisible();
  await expect(page.getByLabel("E-mail")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Name")).not.toHaveAttribute("aria-invalid", "true");
});

test("explains throttling and failures", async ({ page }) => {
  await page.route(API, answer(429, { message: "Too Many Requests" }));
  await page.goto("/pt/about");
  await page.getByLabel("Nome").fill("Maria");
  await page.getByLabel("E-mail").fill("maria@example.com");
  await page.getByLabel("Assunto").fill("Oi");
  await page.getByLabel("Mensagem").fill("Tudo bem?");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Muitas mensagens neste momento.", { exact: false })).toBeVisible();

  await page.unroute(API);
  await page.route(API, (route) => route.abort());
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Não foi possível enviar.", { exact: false })).toBeVisible();
});

test("is translated to Spanish", async ({ page }) => {
  await page.goto("/es/about");
  await expect(page.getByLabel("Nombre")).toBeVisible();
  await expect(page.getByLabel("Correo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar mensaje" })).toBeVisible();
});
