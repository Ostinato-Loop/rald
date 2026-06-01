import { Router } from "express";
import { db } from "@workspace/db";
import {
  workspacesTable,
  workspaceMembersTable,
  customerTagsTable,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  requireAuth,
  requirePermission,
  type AuthRequest,
} from "../lib/auth";
import {
  requireWorkspaceMember,
  type WorkspaceRequest,
} from "../middlewares/workspace";
import { z } from "zod";

const router = Router();

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
});

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["owner", "admin", "member", "viewer"]).default("member"),
});

const createTagSchema = z.object({
  name: z.string().min(1).max(80),
  color: z.string().optional(),
  description: z.string().optional(),
});

// ─── Create workspace ─────────────────────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const parsed = createWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
  }
  const { name, slug } = parsed.data;

  const [existing] = await db
    .select({ id: workspacesTable.id })
    .from(workspacesTable)
    .where(eq(workspacesTable.slug, slug))
    .limit(1);

  if (existing) {
    return res.status(409).json({ error: "Workspace slug already taken" });
  }

  const [workspace] = await db
    .insert(workspacesTable)
    .values({ name, slug, ownerId: req.user!.id })
    .returning();

  // Auto-assign owner membership
  await db.insert(workspaceMembersTable).values({
    workspaceId: workspace.id,
    userId: req.user!.id,
    role: "owner",
  });

  return res.status(201).json(workspace);
});

// ─── List user's workspaces ───────────────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const isAdmin = req.user!.role === "admin" || req.user!.role === "operator";

  if (isAdmin) {
    const workspaces = await db
      .select()
      .from(workspacesTable)
      .orderBy(desc(workspacesTable.createdAt));
    return res.json(workspaces);
  }

  const memberships = await db
    .select({
      workspace: workspacesTable,
      role: workspaceMembersTable.role,
    })
    .from(workspaceMembersTable)
    .innerJoin(
      workspacesTable,
      eq(workspaceMembersTable.workspaceId, workspacesTable.id),
    )
    .where(eq(workspaceMembersTable.userId, userId))
    .orderBy(desc(workspacesTable.createdAt));

  return res.json(memberships.map((m) => ({ ...m.workspace, memberRole: m.role })));
});

// ─── Get workspace ────────────────────────────────────────────────────────────
router.get(
  "/:workspaceId",
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.id, req.workspaceId!))
      .limit(1);
    if (!workspace) return res.status(404).json({ error: "Not found" });
    return res.json({ ...workspace, memberRole: req.workspaceRole });
  },
);

// ─── List workspace members ───────────────────────────────────────────────────
router.get(
  "/:workspaceId/members",
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const members = await db
      .select()
      .from(workspaceMembersTable)
      .where(eq(workspaceMembersTable.workspaceId, req.workspaceId!))
      .orderBy(workspaceMembersTable.createdAt);
    return res.json(members);
  },
);

// ─── Add member ───────────────────────────────────────────────────────────────
router.post(
  "/:workspaceId/members",
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    if (req.workspaceRole !== "owner" && req.workspaceRole !== "admin" &&
        req.user?.role !== "admin" && req.user?.role !== "operator") {
      return res.status(403).json({ error: "Only workspace owners and admins can add members" });
    }
    const parsed = addMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
    }
    const { userId, role } = parsed.data;

    const [existing] = await db
      .select({ id: workspaceMembersTable.id })
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, req.workspaceId!),
          eq(workspaceMembersTable.userId, userId),
        ),
      )
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: "User is already a member of this workspace" });
    }

    const [member] = await db
      .insert(workspaceMembersTable)
      .values({ workspaceId: req.workspaceId!, userId, role })
      .returning();

    return res.status(201).json(member);
  },
);

// ─── Remove member ────────────────────────────────────────────────────────────
router.delete(
  "/:workspaceId/members/:userId",
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    if (req.workspaceRole !== "owner" && req.workspaceRole !== "admin" &&
        req.user?.role !== "admin") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    await db
      .delete(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, req.workspaceId!),
          eq(workspaceMembersTable.userId, req.params.userId),
        ),
      );
    return res.status(204).send();
  },
);

// ─── Tags: list ───────────────────────────────────────────────────────────────
router.get(
  "/:workspaceId/tags",
  requireAuth,
  requirePermission("customer:view"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const tags = await db
      .select()
      .from(customerTagsTable)
      .where(eq(customerTagsTable.workspaceId, req.workspaceId!))
      .orderBy(customerTagsTable.name);
    return res.json(tags);
  },
);

// ─── Tags: create ─────────────────────────────────────────────────────────────
router.post(
  "/:workspaceId/tags",
  requireAuth,
  requirePermission("customer:tag"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const parsed = createTagSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
    }
    const [tag] = await db
      .insert(customerTagsTable)
      .values({
        workspaceId: req.workspaceId!,
        name: parsed.data.name,
        color: parsed.data.color,
        description: parsed.data.description,
        createdBy: req.user!.id,
      })
      .returning();
    return res.status(201).json(tag);
  },
);

// ─── Tags: delete ─────────────────────────────────────────────────────────────
router.delete(
  "/:workspaceId/tags/:tagId",
  requireAuth,
  requirePermission("customer:tag"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    await db
      .delete(customerTagsTable)
      .where(
        and(
          eq(customerTagsTable.id, req.params.tagId),
          eq(customerTagsTable.workspaceId, req.workspaceId!),
        ),
      );
    return res.status(204).send();
  },
);

export default router;
