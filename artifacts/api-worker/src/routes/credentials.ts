import { Hono } from "hono";
import type { Bindings, Variables } from "../index";
import { authMiddleware } from "../lib/middleware";
import { encryptValue } from "../lib/auth";

const credentials = new Hono<{ Bindings: Bindings; Variables: Variables }>();
credentials.use("*", authMiddleware);

credentials.get("/", async (c) => {
  const { data } = await c.get("db").from("credentials").select("id,name,service,type,last_rotated_at,created_at,masked_value").order("created_at");
  return c.json(
    (data ?? []).map((cr: any) => ({
      id: cr.id, name: cr.name, service: cr.service, type: cr.type,
      lastRotatedAt: cr.last_rotated_at, createdAt: cr.created_at, maskedValue: cr.masked_value,
    }))
  );
});

credentials.post("/", async (c) => {
  const user = c.get("user")!;
  if (user.role !== "admin") return c.json({ error: "Insufficient permissions" }, 403);
  const body = await c.req.json().catch(() => null);
  if (!body?.name || !body?.service || !body?.value) return c.json({ error: "name, service, value required" }, 400);
  const encrypted = await encryptValue(body.value, c.env.RALD_ENCRYPTION_KEY);
  const masked = `${body.value.slice(0, 4)}${"*".repeat(Math.max(0, body.value.length - 8))}${body.value.slice(-4)}`;
  const { data, error } = await c.get("db").from("credentials").insert({
    name: body.name, service: body.service, type: body.type ?? "api_key",
    encrypted_value: encrypted, masked_value: masked, last_rotated_at: new Date().toISOString(),
  }).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ id: data.id, name: data.name, service: data.service, type: data.type, lastRotatedAt: data.last_rotated_at, createdAt: data.created_at, maskedValue: data.masked_value }, 201);
});

credentials.patch("/:id/rotate", async (c) => {
  const user = c.get("user")!;
  if (user.role !== "admin") return c.json({ error: "Insufficient permissions" }, 403);
  const body = await c.req.json().catch(() => ({}));
  const { data: existing } = await c.get("db").from("credentials").select("encrypted_value,name").eq("id", c.req.param("id")).single();
  if (!existing) return c.json({ error: "Credential not found" }, 404);
  const newValue = body.value || crypto.randomUUID().replace(/-/g, "");
  const encrypted = await encryptValue(newValue, c.env.RALD_ENCRYPTION_KEY);
  const masked = `${newValue.slice(0, 4)}${"*".repeat(Math.max(0, newValue.length - 8))}${newValue.slice(-4)}`;
  const { data } = await c.get("db").from("credentials")
    .update({ encrypted_value: encrypted, masked_value: masked, last_rotated_at: new Date().toISOString() })
    .eq("id", c.req.param("id")).select().single();
  return c.json({ id: data.id, name: data.name, service: data.service, type: data.type, lastRotatedAt: data.last_rotated_at, maskedValue: data.masked_value });
});

credentials.delete("/:id", async (c) => {
  const user = c.get("user")!;
  if (user.role !== "admin") return c.json({ error: "Insufficient permissions" }, 403);
  await c.get("db").from("credentials").delete().eq("id", c.req.param("id"));
  return new Response(null, { status: 204 });
});

export default credentials;
