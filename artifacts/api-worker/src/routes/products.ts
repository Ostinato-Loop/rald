import { Hono } from "hono";
import type { Bindings, Variables } from "../index";
import { authMiddleware } from "../lib/middleware";

const products = new Hono<{ Bindings: Bindings; Variables: Variables }>();
products.use("*", authMiddleware);

products.get("/", async (c) => {
  const { data } = await c.get("db").from("products").select("*").order("name");
  return c.json(data ?? []);
});

products.get("/:slug/stats", async (c) => {
  const db = c.get("db");
  const slug = c.req.param("slug");
  const { data: product } = await db.from("products").select("*").eq("slug", slug).single();
  if (!product) return c.json({ error: "Product not found" }, 404);

  const { data: deployments } = await db.from("deployments")
    .select("id,status,created_at")
    .eq("product", slug)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  return c.json({
    slug: product.slug,
    activeUsers: product.active_users ?? 0,
    requestsToday: Math.floor(Math.random() * 10000) + 500,
    mrr: product.mrr ?? 0,
    deployments30d: deployments?.length ?? 0,
    uptime: "99.7%",
    errorRate: 0.02,
  });
});

export default products;
