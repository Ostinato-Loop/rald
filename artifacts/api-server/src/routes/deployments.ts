import { Router } from "express";
import { db } from "@workspace/db";
import { deploymentsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../lib/auth";
import { TriggerDeploymentBody } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const deployments = await db.select().from(deploymentsTable).orderBy(deploymentsTable.createdAt);
  return res.json(deployments);
});

router.post("/", requireRole("admin", "operator"), async (req: AuthRequest, res) => {
  const parsed = TriggerDeploymentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
  const { product, service, branch, commitMessage } = parsed.data;
  const [deployment] = await db.insert(deploymentsTable).values({
    product, service, branch: branch ?? "main",
    commitSha: `cf${Date.now().toString(16)}`,
    commitMessage: commitMessage ?? null,
    triggeredBy: req.user!.email,
    status: "pending",
  }).returning();
  setTimeout(async () => {
    await db.update(deploymentsTable)
      .set({ status: "building" })
      .where(eq(deploymentsTable.id, deployment.id));
    setTimeout(async () => {
      await db.update(deploymentsTable)
        .set({ status: "success", completedAt: new Date(), duration: Math.floor(Math.random() * 60) + 30 })
        .where(eq(deploymentsTable.id, deployment.id));
    }, 5000);
  }, 2000);
  return res.status(201).json(deployment);
});

router.get("/:id", async (req, res) => {
  const id = String(req.params.id);
  const [deployment] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, id)).limit(1);
  if (!deployment) return res.status(404).json({ error: "Deployment not found" });
  return res.json(deployment);
});

export default router;
