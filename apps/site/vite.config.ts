import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

import { reloadContentSnapshot } from "./vite/reload-content-snapshot.ts";
import { serveGameBuilds } from "./vite/serve-game-builds.ts";

export default defineConfig({
  plugins: [serveGameBuilds(), reloadContentSnapshot(), reactRouter()],
  // The admin is loaded on demand; listing its dependencies up front avoids a
  // full page reload the first time /admin is opened in development.
  optimizeDeps: {
    include: ["oidc-client-ts", "@tiptap/core", "@tiptap/extension-placeholder", "@tiptap/react", "@tiptap/starter-kit"],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
});
