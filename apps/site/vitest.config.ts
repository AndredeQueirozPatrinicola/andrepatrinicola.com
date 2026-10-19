import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts: the React Router plugin builds the whole
// app and is not needed to test modules and components in isolation.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
  },
});
