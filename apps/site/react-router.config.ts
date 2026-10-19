import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "src",
  // Static hosting (S3 + CloudFront): no runtime server, every route is
  // rendered to its own HTML file at build time.
  ssr: false,
  prerender: ["/"],
  // There is no server to answer lazy manifest requests.
  routeDiscovery: { mode: "initial" },
} satisfies Config;
