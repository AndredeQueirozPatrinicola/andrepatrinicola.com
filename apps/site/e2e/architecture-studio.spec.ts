import { readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Download, type Locator, type Page } from "@playwright/test";

const STUDIO = "/en/labs/architecture-studio";

test.beforeEach(async ({ page }) => {
  // No consent banner over the canvas; tracked events are recorded instead of sent.
  await page.addInitScript(() => localStorage.setItem("analytics-consent", "granted"));
  await page.route("https://cloud.umami.is/script.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "window.__events = []; window.umami = { track: (name, data) => window.__events.push({ name, data }) };",
    }),
  );
});

type TrackedEvent = { name: string; data?: Record<string, string> };
const studioEvents = (page: Page) =>
  page.evaluate(() => ((window as unknown as { __events?: TrackedEvent[] }).__events ?? []).filter((event) => event.name === "architecture-studio").map((event) => event.data?.action));

const canvas = (page: Page) => page.locator(".studio-canvas .react-flow");
const node = (page: Page, label: string) => page.locator(".react-flow__node").filter({ hasText: label });
const field = (page: Page, label: string) => page.getByRole("complementary", { name: "Properties" }).getByLabel(label, { exact: true });

async function newDiagram(page: Page) {
  await page.goto(STUDIO);
  await page.getByRole("link", { name: /Create a blank diagram/ }).click();
  await expect(page).toHaveURL(/\?diagram=d-/);
  await expect(page.getByText("Empty diagram")).toBeVisible();
}

async function add(page: Page, name: string) {
  await page.getByRole("button", { name: `Add ${name} to the diagram` }).click();
}

async function readDownload(download: Download): Promise<Buffer> {
  return readFileSync((await download.path())!);
}

/** Drags from one of a node's connection points to another node. */
async function connect(page: Page, from: Locator, side: "right" | "bottom", to: Locator) {
  await from.hover();
  const handle = from.locator(`.react-flow__handle-${side}`);
  const start = (await handle.boundingBox())!;
  const end = (await to.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 8 });
  await page.mouse.up();
}

test.describe("Cloud Architecture Studio: page", () => {
  test("is pre-rendered with its own title, description and hreflang, without the editor", async ({ request }) => {
    const html = await (await request.get("/es/labs/architecture-studio")).text();
    expect(html).toContain("<title>Cloud Architecture Studio · André Patrinicola</title>");
    expect(html).toContain('hrefLang="pt-BR" href="');
    expect(html).toContain("/pt/labs/architecture-studio");
    expect(html).toContain("Explorar la arquitectura de este portafolio");
    expect(html).toContain('property="og:title"');
    expect(html).not.toContain("react-flow");
    expect(await (await request.get("/sitemap.xml")).text()).toContain("/en/labs/architecture-studio");
  });

  test("is reached from the Labs page in every language", async ({ page }) => {
    for (const [locale, linkName] of [
      ["pt", "Abrir o laboratório"],
      ["en", "Open the lab"],
      ["es", "Abrir el laboratorio"],
    ]) {
      await page.goto(`/${locale}/labs`);
      await page.getByRole("article").filter({ hasText: "Cloud Architecture Studio" }).getByRole("link", { name: linkName }).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/labs/architecture-studio$`));
      await expect(page.getByRole("heading", { level: 1, name: "Cloud Architecture Studio" })).toBeVisible();
    }
  });

  test("loads the editor only when a diagram is opened, and never calls AWS", async ({ page }) => {
    const scripts: string[] = [];
    const external: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (request.resourceType() === "script") scripts.push(url.pathname);
      if (url.hostname !== "localhost" && url.hostname !== "cloud.umami.is") external.push(request.url());
    });
    await page.goto(STUDIO);
    await page.waitForLoadState("networkidle");
    expect(scripts.some((path) => /Workspace-/.test(path))).toBe(false);

    await page.getByRole("link", { name: /Explore this portfolio's architecture/ }).click();
    await expect(node(page, "Lambda studio")).toBeVisible();
    expect(scripts.some((path) => /Workspace-/.test(path))).toBe(true);
    await page.getByRole("button", { name: /Publishing an article/ }).click();
    await page.getByRole("button", { name: "Next" }).click();
    expect(external).toEqual([]);
  });
});

test.describe("Cloud Architecture Studio: explore", () => {
  test("opens the portfolio template read-only and walks through a guided flow", async ({ page }) => {
    await page.goto(STUDIO);
    await page.getByRole("link", { name: /Explore this portfolio's architecture/ }).click();
    await expect(page).toHaveURL(/\?template=portfolio$/);
    await expect(page.getByText("Official template: read-only")).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);

    await page.getByRole("button", { name: /Publishing an article/ }).click();
    const player = page.getByRole("region", { name: "Guided flow" });
    await expect(player).toContainText("Step 1 of 6");
    await expect(node(page, "Lambda studio").locator(".studio-node")).toHaveAttribute("data-highlight", "on");
    await expect(node(page, "Visitor").locator(".studio-node")).toHaveAttribute("data-highlight", "off");

    await player.getByRole("button", { name: "Next" }).click();
    await expect(player).toContainText("Step 2 of 6");
    await expect(player).toContainText("immutable revision");
    await player.getByRole("button", { name: "Previous" }).click();
    await expect(player).toContainText("Step 1 of 6");
    await player.getByRole("button", { name: "End flow" }).click();
    await expect(player).toHaveCount(0);
    await expect(page.locator("[data-highlight]")).toHaveCount(0);
    expect(await studioEvents(page)).toEqual(expect.arrayContaining(["open", "flow"]));
  });

  test("explains a selected component and its connections", async ({ page }) => {
    await page.goto(`${STUDIO}?template=portfolio`);
    await page.getByRole("tab", { name: "In this diagram" }).click();
    await page.getByRole("button", { name: "Select Lambda ai-chat" }).click();

    const details = page.getByRole("complementary", { name: "Details" });
    await expect(details.getByRole("heading", { name: "Lambda ai-chat" })).toBeVisible();
    await expect(details).toContainText("POST /ai/chat");
    await expect(details.getByRole("link", { name: "Official documentation" })).toHaveAttribute("href", /^https:\/\/docs\.aws\.amazon\.com\//);
    await details.getByRole("button", { name: "Knowledge Base" }).click();
    await expect(details.getByRole("heading", { name: "Knowledge Base" })).toBeVisible();
  });

  test("editing a template makes a copy and leaves the template unchanged", async ({ page }) => {
    await page.goto(`${STUDIO}?template=serverless-api`);
    await page.getByRole("button", { name: "Edit a copy" }).click();
    await expect(page).toHaveURL(/\?diagram=d-/);
    await expect(page.getByText("Editable copy created")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Diagram name" })).toHaveValue("Serverless REST API (copy)");

    await node(page, "DynamoDB").click();
    await field(page, "Name").fill("Orders table");
    await expect(node(page, "Orders table")).toBeVisible();

    await page.goto(`${STUDIO}?template=serverless-api`);
    await expect(node(page, "DynamoDB")).toBeVisible();
    await expect(node(page, "Orders table")).toHaveCount(0);
  });
});

test.describe("Cloud Architecture Studio: edit", () => {
  test("adds components by click and by drag and drop, inside groups", async ({ page }) => {
    await newDiagram(page);
    await add(page, "AWS Lambda");
    await expect(node(page, "Lambda")).toBeVisible();

    const pane = canvas(page).locator(".react-flow__pane");
    const box = (await pane.boundingBox())!;
    await page.getByRole("button", { name: "Add Amazon VPC to the diagram" }).dragTo(pane, { targetPosition: { x: 260, y: 220 } });
    await expect(node(page, "VPC")).toBeVisible();
    // Dropped over the VPC: it goes inside it.
    await page.getByRole("button", { name: "Add Amazon RDS to the diagram" }).dragTo(pane, { targetPosition: { x: 260, y: 240 } });
    await node(page, "RDS").click();
    await expect(field(page, "Inside")).toHaveValue(/.+/);
    expect(box.width).toBeGreaterThan(300);
    await expect(page.getByText("3 components")).toBeVisible();
  });

  test("moves, connects, edits, duplicates, deletes, undoes and redoes", async ({ page }) => {
    await newDiagram(page);
    await add(page, "Amazon API Gateway");
    await add(page, "AWS Lambda");
    const gateway = node(page, "API Gateway");
    const lambda = node(page, "Lambda");

    // Move with the mouse: one undo step for the whole drag.
    await gateway.click();
    const x = await field(page, "X").inputValue();
    const start = (await gateway.boundingBox())!;
    await page.mouse.move(start.x + 40, start.y + 20);
    await page.mouse.down();
    await page.mouse.move(start.x - 160, start.y + 20, { steps: 12 });
    await page.mouse.up();
    await expect(field(page, "X")).not.toHaveValue(x);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(field(page, "X")).toHaveValue(x);
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(field(page, "X")).not.toHaveValue(x);

    // Connect by dragging between connection points.
    await connect(page, gateway, "right", lambda);
    await expect(page.locator(".react-flow__edge")).toHaveCount(1);
    const properties = page.getByRole("complementary", { name: "Properties" });
    await expect(properties.getByRole("heading", { name: "Connection" })).toBeVisible();
    await field(page, "Label").fill("Invoke");
    await properties.getByRole("radio", { name: /Asynchronous/ }).check();
    await expect(page.locator(".studio-edge")).toHaveAttribute("data-mode", "asynchronous");
    await expect(page.locator(".studio-edge-label")).toHaveText("Invoke");
    await properties.getByRole("button", { name: "Swap source and target" }).click();
    await expect(properties).toContainText(/FromLambda/);

    // Typing a label is one undo step.
    await lambda.click();
    await field(page, "Name").fill("Orders handler");
    await field(page, "Description").fill("Validates and stores orders.");
    await expect(node(page, "Orders handler")).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(node(page, "Orders handler")).toBeVisible();
    await expect(field(page, "Description")).toHaveValue("");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(node(page, "Orders handler")).toHaveCount(0);
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(node(page, "Orders handler")).toBeVisible();

    await node(page, "Orders handler").click();
    await page.getByRole("complementary", { name: "Properties" }).getByRole("button", { name: "Duplicate" }).click();
    await expect(node(page, "Orders handler")).toHaveCount(2);

    // Deleting a node removes its connections. The copy sits 32px down and
    // to the right of the original: click the original's free corner.
    await node(page, "Orders handler").first().click({ position: { x: 8, y: 8 } });
    await page.keyboard.press("Delete");
    await expect(node(page, "Orders handler")).toHaveCount(1);
    await expect(page.locator(".react-flow__edge")).toHaveCount(0);
    await page.keyboard.press("Control+z");
    await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  });

  test("connects and adds without a pointer", async ({ page }) => {
    await newDiagram(page);
    await page.getByRole("button", { name: "Add Amazon SQS to the diagram" }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Add AWS Lambda to the diagram" }).focus();
    await page.keyboard.press("Enter");

    await page.getByRole("tab", { name: "In this diagram" }).click();
    await page.getByRole("button", { name: "Select SQS" }).click();
    await page.getByLabel("Target").selectOption({ label: "Lambda" });
    await page.getByLabel("Type", { exact: true }).selectOption("asynchronous");
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await expect(page.locator(".studio-edge")).toHaveAttribute("data-mode", "asynchronous");
  });

  test("explore mode turns editing off for the visitor's own diagram", async ({ page }) => {
    await newDiagram(page);
    await add(page, "Amazon S3");
    await page.getByRole("group", { name: "Mode" }).getByRole("button", { name: "Explore" }).click();
    await expect(page.getByRole("button", { name: "Add Amazon S3 to the diagram" })).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "Details" })).toBeVisible();
    await node(page, "S3").click();
    await page.keyboard.press("Delete");
    await expect(node(page, "S3")).toHaveCount(1);
  });
});

test.describe("Cloud Architecture Studio: saving, import and export", () => {
  test("saves in the browser and reopens after a reload", async ({ page }) => {
    await newDiagram(page);
    await page.getByRole("textbox", { name: "Diagram name" }).fill("Checkout flow");
    await add(page, "Amazon DynamoDB");
    await expect(page.getByRole("status").filter({ hasText: "Saved in this browser" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Diagram name" })).toHaveValue("Checkout flow");
    await expect(node(page, "DynamoDB")).toBeVisible();

    await page.goto(STUDIO);
    await page.getByRole("link", { name: "Continue “Checkout flow”" }).click();
    await expect(node(page, "DynamoDB")).toBeVisible();
  });

  test("lists, renames, duplicates and deletes saved diagrams", async ({ page }) => {
    await newDiagram(page);
    await page.getByRole("textbox", { name: "Diagram name" }).fill("First");
    await add(page, "Amazon SNS");
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await page.getByRole("button", { name: "File" }).click();
    await page.getByRole("button", { name: "My diagrams" }).click();
    const dialog = page.getByRole("dialog", { name: "My diagrams" });
    await dialog.getByRole("button", { name: "Duplicate: First" }).click();
    await expect(dialog.getByText("First (copy)")).toBeVisible();
    await dialog.getByRole("button", { name: "Rename: First (copy)" }).click();
    await dialog.getByRole("textbox", { name: "New name" }).fill("Second");
    await dialog.getByRole("button", { name: "Save name" }).click();
    await expect(dialog.getByText("Second", { exact: true })).toBeVisible();

    await dialog.getByRole("button", { name: "Delete: Second" }).click();
    const confirm = page.getByRole("alertdialog", { name: "Delete diagram?" });
    await confirm.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog", { name: "My diagrams" }).getByText("Second", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "My diagrams" }).getByText("First", { exact: true })).toBeVisible();
  });

  test("exports JSON that imports back into an equal, editable diagram", async ({ page }) => {
    await page.goto(`${STUDIO}?template=web-application`);
    await page.getByRole("button", { name: "Edit a copy" }).click();
    await expect(page).toHaveURL(/\?diagram=d-/);

    await page.getByRole("button", { name: "File" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("web-application-copy.architecture.json");
    const exported = JSON.parse((await readDownload(download)).toString("utf8"));
    expect(exported).toMatchObject({ schemaVersion: 1, title: "Web application (copy)" });
    expect(exported.nodes.find((current: { id: string }) => current.id === "task-a")).toMatchObject({ parentId: "subnet-a", position: { x: 30, y: 50 } });
    expect(exported.edges).toHaveLength(11);

    await page.goto(STUDIO);
    await page.getByTestId("start-import-input").setInputFiles({ name: "web.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(exported)) });
    await expect(page).toHaveURL(/\?diagram=d-/);
    await expect(page.getByText("Diagram imported.")).toBeVisible();
    await expect(page.getByText("17 components")).toBeVisible();
    await expect(page.getByText("11 connections")).toBeVisible();
    // An import is always a new diagram, never an overwrite.
    expect(new URL(page.url()).searchParams.get("diagram")).not.toBe(exported.id);
    await node(page, "Secrets Manager").click();
    await field(page, "Name").fill("DB secret");
    await expect(node(page, "DB secret")).toBeVisible();
    expect(await studioEvents(page)).toContain("import");
  });

  test("rejects invalid files with a clear message", async ({ page }) => {
    await page.goto(STUDIO);
    const input = page.getByTestId("start-import-input");
    await input.setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{ not json") });
    await expect(page.getByRole("alert")).toContainText("not valid JSON");

    const future = { schemaVersion: 9, nodes: [], edges: [] };
    await input.setInputFiles({ name: "future.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(future)) });
    await expect(page.getByRole("alert")).toContainText("version 9");

    const evil = {
      schemaVersion: 1,
      id: "d-evil",
      title: "<img src=x onerror=alert(1)>",
      createdAt: "2026-10-26T00:00:00.000Z",
      updatedAt: "2026-10-26T00:00:00.000Z",
      nodes: [{ id: "a", serviceId: "aws-lambda", label: "x", position: { x: 0, y: 0 } }],
      edges: [{ id: "e", source: "a", target: "ghost", mode: "synchronous" }],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    await input.setInputFiles({ name: "evil.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(evil)) });
    await expect(page.getByRole("alert")).toContainText("“ghost”, which does not exist");
    await expect(page).toHaveURL(/architecture-studio$/);

    // A valid file with HTML in its texts shows it as plain text.
    evil.edges = [];
    await input.setInputFiles({ name: "html.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(evil)) });
    await expect(page.getByRole("textbox", { name: "Diagram name" })).toHaveValue("<img src=x onerror=alert(1)>");
    await expect(page.locator("img[src='x']")).toHaveCount(0);
  });

  test("exports the whole diagram as a PNG", async ({ page }) => {
    await page.goto(`${STUDIO}?template=portfolio`);
    await expect(node(page, "Lambda studio")).toBeVisible();
    // Zoom in so most of the diagram is off screen: the export must still frame all of it.
    for (let index = 0; index < 4; index += 1) await page.getByRole("button", { name: "Zoom in" }).click();

    await page.getByRole("button", { name: "File" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("this-portfolio-s-architecture.png");
    const png = await readDownload(download);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    // 2× pixel ratio of the diagram bounds (about 2000 × 1500) plus padding.
    expect(width).toBeGreaterThan(3500);
    expect(height).toBeGreaterThan(2500);
    await expect(page.getByText("PNG exported.")).toBeVisible();
    expect(await studioEvents(page)).toContain("export-png");
  });

  test("draws the connections in the PNG, not only the components", async ({ page }) => {
    await page.goto(`${STUDIO}?template=async-processing`);
    await expect(node(page, "Producer")).toBeVisible();
    await page.getByRole("button", { name: "File" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PNG" }).click();
    const png = await readDownload(await downloadPromise);

    // The queue sits at the top of the bounds, 300 px from the left; its
    // redrive connection leaves its bottom side at the middle (the label is
    // further down). With the 48 px margin and the 2x pixel ratio, scan that
    // vertical line just below the node.
    const height = await node(page, "SQS queue").evaluate((element) => (element as HTMLElement).offsetHeight);
    const painted = await page.evaluate(
      async ({ data, x, y }) => {
        const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(data), (char) => char.charCodeAt(0))], { type: "image/png" }));
        const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
        context.drawImage(bitmap, 0, 0);
        const background = context.getImageData(4, 4, 1, 1).data;
        const strip = context.getImageData(x, y, 4, 40).data;
        let different = 0;
        for (let index = 0; index < strip.length; index += 4) {
          if (Math.abs(strip[index] - background[0]) + Math.abs(strip[index + 1] - background[1]) + Math.abs(strip[index + 2] - background[2]) > 60) different += 1;
        }
        return different;
      },
      { data: png.toString("base64"), x: (48 + 300 + 92) * 2 - 2, y: Math.round((48 + height + 6) * 2) },
    );
    expect(painted).toBeGreaterThan(5);
  });

  test("keeps working when the browser refuses to save", async ({ page }) => {
    await page.addInitScript(() => {
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.startsWith("architecture-studio:")) throw new DOMException("full", "QuotaExceededError");
        return setItem.call(this, key, value);
      };
    });
    await newDiagram(page);
    await add(page, "Amazon SQS");
    await expect(page.getByRole("alert").filter({ hasText: "storage is full" })).toBeVisible();
    await expect(node(page, "SQS")).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Not saved" })).toBeVisible();
  });

  test("reports a diagram that is not in this browser", async ({ page }) => {
    await page.goto(`${STUDIO}?diagram=d-missing`);
    await expect(page.getByRole("alert")).toContainText("does not exist in this browser");
    await page.getByRole("link", { name: "Back to the start" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Cloud Architecture Studio" })).toBeVisible();
  });
});

test.describe("Cloud Architecture Studio: accessibility", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`the editor has no serious violations (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(`${STUDIO}?template=portfolio`);
      await expect(node(page, "Lambda studio")).toBeVisible();
      await page.getByRole("button", { name: /Asking the assistant/ }).click();
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
      expect(serious.map((violation) => `${violation.id}: ${violation.nodes.map((current) => current.target).join(", ")}`)).toEqual([]);
    });
  }

  test("supports the keyboard: shortcuts, dialogs and focus", async ({ page }) => {
    await newDiagram(page);
    await add(page, "AWS Lambda");
    await node(page, "Lambda").click();
    await page.keyboard.press("Control+d");
    await expect(node(page, "Lambda")).toHaveCount(2);
    await page.keyboard.press("Control+z");
    await expect(node(page, "Lambda")).toHaveCount(1);

    const file = page.getByRole("button", { name: "File" });
    await file.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Open template" }).click();
    const dialog = page.getByRole("dialog", { name: "Templates" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
