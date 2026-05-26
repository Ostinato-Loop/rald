import { Hono } from "hono";
import type { Bindings, Variables } from "../index";
import { authMiddleware } from "../lib/middleware";

const services = new Hono<{ Bindings: Bindings; Variables: Variables }>();
services.use("*", authMiddleware);

services.get("/", async (c) => {
  const { data } = await c.get("db").from("services").select("*").order("name");
  return c.json(
    (data ?? []).map((s: any) => ({
      id: s.id, name: s.name, slug: s.slug, status: s.status,
      product: s.product, url: s.url, version: s.version,
      region: s.region, uptime: s.uptime, responseTimeMs: s.response_time_ms,
      lastDeployedAt: s.last_deployed_at,
    }))
  );
});

services.get("/:id", async (c) => {
  const { data } = await c.get("db").from("services").select("*").eq("id", c.req.param("id")).single();
  if (!data) return c.json({ error: "Service not found" }, 404);
  return c.json(data);
});

services.post("/:id/restart", async (c) => {
  const db = c.get("db");
  const { data: service } = await db.from("services").select("id,name").eq("id", c.req.param("id")).single();
  if (!service) return c.json({ error: "Service not found" }, 404);
  await db.from("services").update({ status: "deploying", updated_at: new Date().toISOString() }).eq("id", c.req.param("id"));
  c.executionCtx.waitUntil(
    new Promise<void>((resolve) => {
      setTimeout(async () => {
        await db.from("services").update({ status: "healthy", updated_at: new Date().toISOString() }).eq("id", c.req.param("id"));
        resolve();
      }, 3000);
    })
  );
  return c.json({ success: true, message: `Restart triggered for ${service.name}` });
});

export default services;
