import { createRequestHandler } from "react-router";

// Durable Object must be exported from the Worker entry (declared in wrangler.jsonc).
export { EventBroadcaster } from "../app/lib/events/event-broadcaster";

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  STORAGE: R2Bucket;
  EVENT_BROADCASTER: DurableObjectNamespace;
  [key: string]: unknown;
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    // Provide bindings under both shapes: some routes read context.env
    // directly (e.g. admin.emails -> context.env.DB), others use
    // context.cloudflare.env (or the `context.env ?? context.cloudflare?.env`
    // fallback). Passing both keeps every loader/action working.
    return requestHandler(request, { env, cloudflare: { env, ctx } });
  },
} satisfies ExportedHandler<Env>;
