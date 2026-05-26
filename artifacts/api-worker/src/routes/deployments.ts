import { Hono } from "hono";
import type { Bindings, Variables } from "../index";
import { authMiddleware } from "../lib/middleware";

const deployments = new Hono<{ Bindings: Bindings; Variables: Variables }>();
deployments.use("*", authMiddleware);

deployments.get("/", async (c) => {
  const { data } = await c.get("db").from("deployments").select("*").order("created_at", { ascending: false });
  return c.json(data ?? []);
});

deployments.post("/", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json().catch(() => null);
  if (!body?.serviceId) return c.json({ error: "serviceId required" }, 400);

  const { data: service } = await c.get("db").from("services").select("name,product").eq("id", body.serviceId).single();
  if (!service) return c.json({ error: "Service not found" }, 404);

  const { data: deployment } = await c.get("db").from("deployments").insert({
    service_id: body.serviceId,
    service_name: service.name,
    product: service.product,
    environment: body.environment ?? "production",
    version: body.version ?? "latest",
    status: "pending",
    triggered_by: user.email,
    commit_sha: `cf${Date.now().toString(16)}`,
  }).select().single();

  c.executionCtx.waitUntil(
    (async () => {
      const db = c.get("db");
      await new Promise(r => setTimeout(r, 2000));
      await db.from("deployments").update({ status: "building" }).eq("id", deployment.id);
      await new Promise(r => setTimeout(r, 5000));
      await db.from("deployments").update({
        status: "success",
        completed_at: new Date().toISOString(),
        duration: `${Math.floor(Math.random() * 60) + 30}s`,
      }).eq("id", deployment.id);
    })()
  );

  return c.json(deployment, 201);
});

deployments.get("/:id", async (c) => {
  const { data } = await c.get("db").from("deployments").select("*").eq("id", c.req.param("id")).single();
  if (!data) return c.json({ error: "Deployment not found" }, 404);
  return c.json(data);
});

export default deployments;
