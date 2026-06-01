import { Router } from "express";
import { db } from "@workspace/db";
import {
  notificationsTable,
  notificationTemplatesTable,
  notificationPreferencesTable,
  notificationDeliveriesTable,
} from "@workspace/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requirePermission, type AuthRequest } from "../lib/auth";
import { requireWorkspaceMember, type WorkspaceRequest } from "../middlewares/workspace";
import { publishEvent } from "../lib/events";

const router = Router({ mergeParams: true });

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.enum([
    "assignment", "invitation", "mention", "message",
    "booking", "customer_activity", "system_alert", "integration_alert",
  ]),
  channel: z.enum(["in_app", "email", "sms", "push", "whatsapp"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  referenceType: z.string().max(80).optional(),
  referenceId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateNotificationSchema = z.object({
  status: z.enum(["unread", "read", "archived", "dismissed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
});

const bulkActionSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  action: z.enum(["read", "archive", "dismiss"]),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum([
    "assignment", "invitation", "mention", "message",
    "booking", "customer_activity", "system_alert", "integration_alert",
  ]),
  channel: z.enum(["in_app", "email", "sms", "push", "whatsapp"]),
  titleTemplate: z.string().min(1),
  bodyTemplate: z.string().min(1),
  variables: z.record(z.unknown()).optional(),
});

const upsertPreferenceSchema = z.object({
  channel: z.enum(["in_app", "email", "sms", "push", "whatsapp"]),
  type: z.enum([
    "assignment", "invitation", "mention", "message",
    "booking", "customer_activity", "system_alert", "integration_alert",
  ]),
  enabled: z.boolean(),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function assertWorkspace(req: WorkspaceRequest, res: import("express").Response): string | null {
  const workspaceId = req.workspaceId ?? req.params.workspaceId;
  if (!workspaceId) {
    res.status(400).json({ error: "Workspace ID required" });
    return null;
  }
  return workspaceId;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /workspaces/:workspaceId/notifications  — list for current user
router.get(
  "/",
  requireAuth,
  requirePermission("notification:view"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = assertWorkspace(req, res);
    if (!workspaceId) return;
    const userId = req.user!.id;

    const rows = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.workspaceId, workspaceId),
          eq(notificationsTable.userId, userId),
        ),
      )
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);

    const unread = rows.filter((n) => n.status === "unread").length;
    res.json({ notifications: rows, unreadCount: unread, total: rows.length });
  },
);

// POST /workspaces/:workspaceId/notifications — create notification
router.post(
  "/",
  requireAuth,
  requirePermission("notification:create"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = assertWorkspace(req, res);
    if (!workspaceId) return;

    const parsed = createNotificationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const [row] = await db
      .insert(notificationsTable)
      .values({
        ...parsed.data,
        workspaceId,
        createdBy: req.user!.id,
      })
      .returning();

    await publishEvent({
      workspaceId,
      eventType: "NotificationCreated",
      aggregateType: "notification",
      aggregateId: row!.id,
      actorId: req.user!.id,
      payload: { notificationId: row!.id, type: row!.type, userId: row!.userId },
    });

    // Create in_app delivery record
    await db.insert(notificationDeliveriesTable).values({
      notificationId: row!.id,
      channel: "in_app",
      status: "delivered",
      attempts: 1,
      deliveredAt: new Date(),
    });

    res.status(201).json(row);
  },
);

// PATCH /workspaces/:workspaceId/notifications/:id — update status
router.patch(
  "/:id",
  requireAuth,
  requirePermission("notification:update"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = assertWorkspace(req, res);
    if (!workspaceId) return;

    const parsed = updateNotificationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const now = new Date();
    const extra: Record<string, unknown> = {};
    if (parsed.data.status === "read") extra.readAt = now;
    if (parsed.data.status === "archived") extra.archivedAt = now;

    const [row] = await db
      .update(notificationsTable)
      .set({ ...parsed.data, ...extra })
      .where(
        and(
          eq(notificationsTable.id, req.params.id),
          eq(notificationsTable.workspaceId, workspaceId),
          eq(notificationsTable.userId, req.user!.id),
        ),
      )
      .returning();

    if (!row) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    if (parsed.data.status === "read") {
      await publishEvent({
        workspaceId,
        eventType: "NotificationRead",
        aggregateType: "notification",
        aggregateId: row.id,
        actorId: req.user!.id,
        payload: { notificationId: row.id },
      });
    }

    res.json(row);
  },
);

// POST /workspaces/:workspaceId/notifications/bulk — bulk read/archive/dismiss
router.post(
  "/bulk",
  requireAuth,
  requirePermission("notification:update"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = assertWorkspace(req, res);
    if (!workspaceId) return;

    const parsed = bulkActionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const statusMap: Record<string, "read" | "archived" | "dismissed"> = {
      read: "read",
      archive: "archived",
      dismiss: "dismissed",
    };
    const newStatus = statusMap[parsed.data.action]!;
    const now = new Date();
    const extra: Record<string, unknown> = {};
    if (newStatus === "read") extra.readAt = now;
    if (newStatus === "archived") extra.archivedAt = now;

    const updated = await db
      .update(notificationsTable)
      .set({ status: newStatus, ...extra })
      .where(
        and(
          inArray(notificationsTable.id, parsed.data.ids),
          eq(notificationsTable.workspaceId, workspaceId),
          eq(notificationsTable.userId, req.user!.id),
        ),
      )
      .returning({ id: notificationsTable.id });

    res.json({ updated: updated.length, ids: updated.map((r) => r.id) });
  },
);

// DELETE /workspaces/:workspaceId/notifications/:id — dismiss (soft)
router.delete(
  "/:id",
  requireAuth,
  requirePermission("notification:dismiss"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = assertWorkspace(req, res);
    if (!workspaceId) return;

    const [row] = await db
      .update(notificationsTable)
      .set({ status: "dismissed" })
      .where(
        and(
          eq(notificationsTable.id, req.params.id),
          eq(notificationsTable.workspaceId, workspaceId),
          eq(notificationsTable.userId, req.user!.id),
        ),
      )
      .returning({ id: notificationsTable.id });

    if (!row) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json({ dismissed: true, id: row.id });
  },
);

// ─── Templates ────────────────────────────────────────────────────────────────

// GET /workspaces/:workspaceId/notifications/templates
router.get(
  "/templates",
  requireAuth,
  requirePermission("notification:manage_templates"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = assertWorkspace(req, res);
    if (!workspaceId) return;

    const rows = await db
      .select()
      .from(notificationTemplatesTable)
      .where(eq(notificationTemplatesTable.workspaceId, workspaceId))
      .orderBy(desc(notificationTemplatesTable.createdAt));

    res.json(rows);
  },
);

// POST /workspaces/:workspaceId/notifications/templates
router.post(
  "/templates",
  requireAuth,
  requirePermission("notification:manage_templates"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = assertWorkspace(req, res);
    if (!workspaceId) return;

    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const [row] = await db
      .insert(notificationTemplatesTable)
      .values({ ...parsed.data, workspaceId, createdBy: req.user!.id })
      .returning();

    res.status(201).json(row);
  },
);

// ─── Preferences ──────────────────────────────────────────────────────────────

// GET /workspaces/:workspaceId/notifications/preferences
router.get(
  "/preferences",
  requireAuth,
  requirePermission("notification:view"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = assertWorkspace(req, res);
    if (!workspaceId) return;

    const rows = await db
      .select()
      .from(notificationPreferencesTable)
      .where(
        and(
          eq(notificationPreferencesTable.workspaceId, workspaceId),
          eq(notificationPreferencesTable.userId, req.user!.id),
        ),
      );

    res.json(rows);
  },
);

// PUT /workspaces/:workspaceId/notifications/preferences — upsert preference
router.put(
  "/preferences",
  requireAuth,
  requirePermission("notification:manage_preferences"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = assertWorkspace(req, res);
    if (!workspaceId) return;

    const parsed = upsertPreferenceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const [row] = await db
      .insert(notificationPreferencesTable)
      .values({ ...parsed.data, workspaceId, userId: req.user!.id })
      .onConflictDoUpdate({
        target: [
          notificationPreferencesTable.workspaceId,
          notificationPreferencesTable.userId,
          notificationPreferencesTable.channel,
          notificationPreferencesTable.type,
        ],
        set: { enabled: parsed.data.enabled, updatedAt: new Date() },
      })
      .returning();

    res.json(row);
  },
);

export default router;
