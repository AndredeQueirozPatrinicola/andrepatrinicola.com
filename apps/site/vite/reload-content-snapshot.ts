import { resolve } from "node:path";

import type { Plugin, ViteDevServer } from "vite";

/** React Router's virtual modules; the server build carries the list of pre-rendered paths. */
const virtualModules = ["server-build", "server-manifest", "browser-manifest"].map((name) => `\0virtual:react-router/${name}`);

function invalidate(server: ViteDevServer): void {
  const graphs = [server.moduleGraph, ...Object.values(server.environments).map((environment) => environment.moduleGraph)];
  for (const graph of graphs) {
    for (const id of virtualModules) {
      const module = graph.getModuleById(id);
      if (module) graph.invalidateModule(module as never);
    }
  }
}

/**
 * In development, a new content snapshot (a publish through the API's local
 * server) is served without restarting: with `ssr: false`, React Router only
 * answers data requests for pre-rendered paths, and that list comes from the
 * snapshot. The loaders read the file again by themselves (loadSnapshot).
 */
export function reloadContentSnapshot(): Plugin {
  return {
    name: "reload-content-snapshot",
    apply: "serve",
    configureServer(server) {
      // Same rule as snapshotPath() in src/data/snapshot/content.ts (not
      // imported: the Vite config stays free of app code).
      const configured = process.env.CONTENT_SNAPSHOT;
      const file = configured
        ? resolve(process.env.INIT_CWD ?? process.cwd(), configured)
        : resolve(server.config.root, "content/blog-snapshot.json");
      server.watcher.add(file);
      const onChange = (changed: string) => {
        if (changed !== file) return;
        invalidate(server);
        server.config.logger.info("Content snapshot changed: reloading the blog.", { timestamp: true });
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", onChange);
      server.watcher.on("change", onChange);
      server.watcher.on("unlink", onChange);
    },
  };
}
