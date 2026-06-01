import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../lib/auth";
import { requireWorkspaceMember, type WorkspaceRequest } from "../middlewares/workspace";
import { globalSearch, searchCustomers, searchCustomerNotes, searchNotifications } from "../lib/search";

const router = Router({ mergeParams: true });

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// GET /workspaces/:workspaceId/search?q=...  — global workspace search
router.get(
  "/",
  requireAuth,
  requirePermission("customer:view"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = req.workspaceId ?? req.params.workspaceId;
    if (!workspaceId) {
      res.status(400).json({ error: "Workspace ID required" });
      return;
    }

    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const { q, limit } = parsed.data;
    const results = await globalSearch(workspaceId, req.user!.id, q, limit);
    res.json(results);
  },
);

// GET /workspaces/:workspaceId/search/customers
router.get(
  "/customers",
  requireAuth,
  requirePermission("customer:view"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = req.workspaceId ?? req.params.workspaceId;
    if (!workspaceId) {
      res.status(400).json({ error: "Workspace ID required" });
      return;
    }

    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const { q, limit, offset } = parsed.data;
    const items = await searchCustomers(workspaceId, q, limit, offset);
    res.json({ items, query: q, index: "customers" });
  },
);

// GET /workspaces/:workspaceId/search/notes
router.get(
  "/notes",
  requireAuth,
  requirePermission("customer:view"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = req.workspaceId ?? req.params.workspaceId;
    if (!workspaceId) {
      res.status(400).json({ error: "Workspace ID required" });
      return;
    }

    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const { q, limit, offset } = parsed.data;
    const items = await searchCustomerNotes(workspaceId, q, limit, offset);
    res.json({ items, query: q, index: "customer_notes" });
  },
);

// GET /workspaces/:workspaceId/search/notifications
router.get(
  "/notifications",
  requireAuth,
  requirePermission("notification:view"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = req.workspaceId ?? req.params.workspaceId;
    if (!workspaceId) {
      res.status(400).json({ error: "Workspace ID required" });
      return;
    }

    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const { q, limit, offset } = parsed.data;
    const items = await searchNotifications(workspaceId, req.user!.id, q, limit, offset);
    res.json({ items, query: q, index: "notifications" });
  },
);

export default router;
