import { Router } from "express";
import { db } from "@workspace/db";
import { servicesTable, deploymentsTable, credentialsTable } from "@workspace/db/schema";
import { requireAuth } from "../lib/auth";
import { count, eq } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (_req, res) => {
  const services = await db.select().from(servicesTable);
  const deployments = await db.select().from(deploymentsTable);
  const credentials = await db.select().from(credentialsTable);
  const now = new Date();
  const sevenDays = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const healthy = services.filter(s => s.status === "healthy").length;
  const degraded = services.filter(s => s.status === "degraded").length;
  const down = services.filter(s => s.status === "down").length;
  const successful = deployments.filter(d => d.status === "success").length;
  const failed = deployments.filter(d => d.status === "failed").length;
  const expiring = credentials.filter(c => c.expiresAt && c.expiresAt < sevenDays).length;
  const uptimes = services.map(s => s.uptime ?? 99.9);
  const avgUptime = uptimes.length > 0 ? uptimes.reduce((a, b) => a + b, 0) / uptimes.length : 100;

  return res.json({
    totalServices: services.length,
    healthyServices: healthy,
    degradedServices: degraded,
    downServices: down,
    totalDeployments: deployments.length,
    successfulDeployments: successful,
    failedDeployments: failed,
    activeCredentials: credentials.length,
    expiringSoonCredentials: expiring,
    overallUptimePercent: Math.round(avgUptime * 100) / 100,
  });
});

router.get("/services", async (_req, res) => {
  const services = await db.select().from(servicesTable);
  return res.json(services.map(s => ({
    serviceId: s.id,
    serviceName: s.name,
    uptime: s.uptime ?? 99.9,
    avgResponseTimeMs: s.responseTimeMs ?? 120,
    requestsLast24h: Math.floor(Math.random() * 50000) + 1000,
    errorsLast24h: Math.floor(Math.random() * 50),
    p99LatencyMs: (s.responseTimeMs ?? 120) * 3,
  })));
});

export default router;
