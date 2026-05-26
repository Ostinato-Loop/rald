import { Router } from "express";
import { db } from "@workspace/db";
import { servicesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const services = await db.select().from(servicesTable);
  return res.json(services.map(s => ({
    id: s.id, name: s.name, slug: s.slug, status: s.status,
    product: s.product, url: s.url, version: s.version,
    region: s.region, uptime: s.uptime, responseTimeMs: s.responseTimeMs,
    lastDeployedAt: s.lastDeployedAt,
  })));
});

router.get("/:id", async (req, res) => {
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, req.params.id)).limit(1);
  if (!service) return res.status(404).json({ error: "Service not found" });
  return res.json(service);
});

router.post("/:id/restart", async (req, res) => {
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, req.params.id)).limit(1);
  if (!service) return res.status(404).json({ error: "Service not found" });
  await db.update(servicesTable).set({ status: "deploying", updatedAt: new Date() }).where(eq(servicesTable.id, req.params.id));
  setTimeout(async () => {
    await db.update(servicesTable).set({ status: "healthy", updatedAt: new Date() }).where(eq(servicesTable.id, req.params.id));
  }, 3000);
  return res.json({ success: true, message: `Restart triggered for ${service.name}` });
});

export default router;
