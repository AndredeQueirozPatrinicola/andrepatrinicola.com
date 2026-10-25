import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const paths = ["/pt", "/en/games", "/en/games/pong", "/es/labs", "/en/labs/distributed-systems", "/en/about", "/pt/resume", "/404.html", "/pt/blog", "/pt/blog/arquitetura-serverless-do-portfolio"];

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    for (const path of paths) {
      test(`${path} has no serious accessibility violations`, async ({ page }) => {
        await page.goto(path);
        const results = await new AxeBuilder({ page })
          // The home canvas is decorative and hidden from assistive technology.
          .exclude(".playfield-canvas")
          .analyze();
        const serious = results.violations.filter((violation) =>
          ["serious", "critical"].includes(violation.impact ?? ""),
        );
        expect(serious.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(", ")}`)).toEqual([]);
      });
    }
  });
}
