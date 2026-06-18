import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "app",
  ssr: true,
  serverModuleFormat: "esm",
  // Cloudflare-specific configuration
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
    // Build through Vite's Environment API so the @cloudflare/vite-plugin and
    // React Router agree on the build output (both target build/).
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
