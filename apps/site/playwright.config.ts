import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the assembled production build (.deploy),
 * served with the same URL rules as CloudFront. Build first: npm run build.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "node scripts/serve-deploy.mjs 4173",
    cwd: "../..",
    url: "http://localhost:4173/pt",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /layout|navigation/ },
  ],
});
