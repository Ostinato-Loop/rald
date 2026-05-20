/**
 * Local dev entry: serves the Hono worker via @hono/node-server.
 * Production: wrangler deploys src/worker.ts directly to Cloudflare Workers.
 */
import { serve } from "@hono/node-server";
import app from "./worker";

const port = Number(process.env["PORT"] ?? "8787");
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${process.env["PORT"]}"`);

serve({ fetch: app.fetch, port }, () => {
  console.log(`[RALD] API Server listening on port ${port}`);
});
