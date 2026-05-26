import { Router } from "express";
import { db } from "@workspace/db";
import { credentialsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, encryptValue } from "../lib/auth";
import { CreateCredentialBody, RotateCredentialBody } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const creds = await db.select().from(credentialsTable);
  return res.json(creds.map(c => ({
    id: c.id, key: c.key, category: c.category,
    description: c.description, lastRotatedAt: c.lastRotatedAt,
    createdAt: c.createdAt, expiresAt: c.expiresAt,
  })));
});

router.post("/", requireRole("admin"), async (req, res) => {
  const parsed = CreateCredentialBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
  const { key, value, category, description, expiresAt } = parsed.data;
  const encrypted = encryptValue(value);
  const [cred] = await db.insert(credentialsTable).values({
    key, encryptedValue: encrypted, category,
    description: description ?? null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    lastRotatedAt: new Date(),
  }).returning();
  return res.status(201).json({
    id: cred.id, key: cred.key, category: cred.category,
    description: cred.description, lastRotatedAt: cred.lastRotatedAt,
    createdAt: cred.createdAt, expiresAt: cred.expiresAt,
  });
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const id = String(req.params.id);
  const parsed = RotateCredentialBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
  const encrypted = encryptValue(parsed.data.value);
  const [cred] = await db.update(credentialsTable)
    .set({ encryptedValue: encrypted, lastRotatedAt: new Date(), updatedAt: new Date() })
    .where(eq(credentialsTable.id, id))
    .returning();
  if (!cred) return res.status(404).json({ error: "Credential not found" });
  return res.json({
    id: cred.id, key: cred.key, category: cred.category,
    description: cred.description, lastRotatedAt: cred.lastRotatedAt,
    createdAt: cred.createdAt, expiresAt: cred.expiresAt,
  });
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const id = String(req.params.id);
  await db.delete(credentialsTable).where(eq(credentialsTable.id, id));
  return res.status(204).send();
});

export default router;
