// This config helper already includes common plugins (TanStack Start, React, Tailwind, TS paths,
// Cloudflare build integration, env injection, aliases, and dedupe). Avoid adding duplicates.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
