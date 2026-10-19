import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

import { serveGameBuilds } from "./vite/serve-game-builds.ts";

export default defineConfig({
  plugins: [serveGameBuilds(), reactRouter()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
});
