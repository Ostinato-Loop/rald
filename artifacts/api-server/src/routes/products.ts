import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, deploymentsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const products = await db.select().from(productsTable);
  return res.json(products);
});

router.get("/:slug/stats", async (req, res) => {
  const [product] = await db.select().from(productsTable).where(eq(productsTable.slug, req.params.slug)).limit(1);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const deployments = await db.select().from(deploymentsTable).where(eq(deploymentsTable.product, req.params.slug));
  const recent = deployments.slice(-5).reverse();
  return res.json({
    slug: product.slug,
    activeUsers: product.activeUsers ?? 0,
    mrr: product.mrr ?? 0,
    deployments30d: deployments.filter(d => d.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
    uptime30d: 99.7,
    errorRate: 0.02,
    recentDeployments: recent,
  });
});

export default router;
