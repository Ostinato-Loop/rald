import { Router } from "express";
import { db } from "@workspace/db";
import {
  customersTable,
  customerIdentitiesTable,
  customerActivitiesTable,
  customerNotesTable,
  customerTagsTable,
  customerTagAssignmentsTable,
  customerMergeHistoryTable,
} from "@workspace/db/schema";
import { eq, and, or, ilike, isNull, isNotNull, desc, sql } from "drizzle-orm";
import { requireAuth, requirePermission, type AuthRequest } from "../lib/auth";
import {
  requireWorkspaceMember,
  type WorkspaceRequest,
} from "../middlewares/workspace";
import { z } from "zod";

const router = Router({ mergeParams: true });

// ─── Helper: log customer activity ───────────────────────────────────────────
async function logActivity(
  customerId: string,
  workspaceId: string,
  eventType: string,
  actorId?: string,
  actorName?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db.insert(customerActivitiesTable).values({
    customerId,
    workspaceId,
    eventType,
    actorId: actorId ?? null,
    actorName: actorName ?? null,
    metadata: metadata ?? null,
  });
}

// ─── Helper: verify customer belongs to workspace ─────────────────────────────
async function getCustomerOrFail(
  customerId: string,
  workspaceId: string,
  res: ReturnType<Router["use"]> extends never ? never : any,
): Promise<(typeof customersTable.$inferSelect) | null> {
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, customerId),
        eq(customersTable.workspaceId, workspaceId),
        isNull(customersTable.deletedAt),
      ),
    )
    .limit(1);

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return null;
  }
  return customer;
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────
const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().max(120).optional(),
  displayName: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  avatarUrl: z.string().url().optional(),
  source: z.string().max(60).optional(),
});

const updateCustomerSchema = z.object({
  firstName: z.string().min(1).max(120).optional(),
  lastName: z.string().max(120).optional().nullable(),
  displayName: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  status: z.enum(["active", "inactive", "blocked"]).optional(),
  source: z.string().max(60).optional().nullable(),
});

const addIdentitySchema = z.object({
  type: z.enum([
    "email", "phone", "whatsapp", "instagram",
    "facebook", "website", "loop_messenger", "custom",
  ]),
  value: z.string().min(1).max(300),
  isPrimary: z.boolean().default(false),
  customLabel: z.string().max(80).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const addNoteSchema = z.object({
  content: z.string().min(1).max(10000),
  isPinned: z.boolean().default(false),
});

const mergeCustomersSchema = z.object({
  primaryCustomerId: z.string().min(1),
  mergedCustomerId: z.string().min(1),
});

// ─── LIST customers ───────────────────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  requirePermission("customer:view"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = req.workspaceId!;
    const {
      q,
      status,
      tag,
      page = "1",
      limit = "50",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions: ReturnType<typeof eq>[] = [
      eq(customersTable.workspaceId, workspaceId) as any,
      isNull(customersTable.deletedAt) as any,
    ];

    if (q?.trim()) {
      const term = `%${q.trim()}%`;
      conditions.push(
        or(
          ilike(customersTable.firstName, term),
          ilike(customersTable.lastName, term),
          ilike(customersTable.displayName, term),
          ilike(customersTable.email, term),
          ilike(customersTable.phone, term),
          ilike(customersTable.raldCustomerId, term),
        ) as any,
      );
    }

    if (status) {
      conditions.push(
        eq(customersTable.status, status as "active" | "inactive" | "blocked") as any,
      );
    }

    const customers = await db
      .select()
      .from(customersTable)
      .where(and(...(conditions as any[])))
      .orderBy(desc(customersTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    // If filtering by tag, post-filter (simple approach)
    let result = customers;
    if (tag) {
      const taggedCustomerIds = await db
        .select({ customerId: customerTagAssignmentsTable.customerId })
        .from(customerTagAssignmentsTable)
        .innerJoin(
          customerTagsTable,
          eq(customerTagAssignmentsTable.tagId, customerTagsTable.id),
        )
        .where(
          and(
            eq(customerTagAssignmentsTable.workspaceId, workspaceId),
            eq(customerTagsTable.name, tag),
          ),
        );
      const ids = new Set(taggedCustomerIds.map((r) => r.customerId));
      result = customers.filter((c) => ids.has(c.id));
    }

    return res.json({
      data: result,
      page: pageNum,
      limit: limitNum,
      total: result.length,
    });
  },
);

// ─── CREATE customer ──────────────────────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  requirePermission("customer:create"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = req.workspaceId!;
    const parsed = createCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
    }

    // Duplicate detection: check email if provided
    if (parsed.data.email) {
      const [dupe] = await db
        .select({ id: customersTable.id, firstName: customersTable.firstName })
        .from(customersTable)
        .where(
          and(
            eq(customersTable.workspaceId, workspaceId),
            eq(customersTable.email, parsed.data.email),
            isNull(customersTable.deletedAt),
          ),
        )
        .limit(1);
      if (dupe) {
        return res.status(409).json({
          error: "A customer with this email already exists",
          existingCustomerId: dupe.id,
          existingCustomerName: dupe.firstName,
        });
      }
    }

    // Duplicate detection: check phone if provided
    if (parsed.data.phone) {
      const [dupe] = await db
        .select({ id: customersTable.id, firstName: customersTable.firstName })
        .from(customersTable)
        .where(
          and(
            eq(customersTable.workspaceId, workspaceId),
            eq(customersTable.phone, parsed.data.phone),
            isNull(customersTable.deletedAt),
          ),
        )
        .limit(1);
      if (dupe) {
        return res.status(409).json({
          error: "A customer with this phone already exists",
          existingCustomerId: dupe.id,
          existingCustomerName: dupe.firstName,
        });
      }
    }

    const [customer] = await db
      .insert(customersTable)
      .values({
        workspaceId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        displayName: parsed.data.displayName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        avatarUrl: parsed.data.avatarUrl,
        source: parsed.data.source,
        createdBy: req.user!.id,
      })
      .returning();

    // Auto-create identities for email/phone
    const identityInserts: { customerId: string; workspaceId: string; type: any; value: string; isPrimary: boolean }[] = [];
    if (customer.email) {
      identityInserts.push({ customerId: customer.id, workspaceId, type: "email", value: customer.email, isPrimary: true });
    }
    if (customer.phone) {
      identityInserts.push({ customerId: customer.id, workspaceId, type: "phone", value: customer.phone, isPrimary: !customer.email });
    }
    if (identityInserts.length > 0) {
      await db.insert(customerIdentitiesTable).values(identityInserts).onConflictDoNothing();
    }

    await logActivity(customer.id, workspaceId, "customer_created", req.user!.id, req.user!.email);

    return res.status(201).json(customer);
  },
);

// ─── GET customer ─────────────────────────────────────────────────────────────
router.get(
  "/:id",
  requireAuth,
  requirePermission("customer:view"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const customer = await getCustomerOrFail(req.params.id, req.workspaceId!, res);
    if (!customer) return;

    const [identities, tagAssignments] = await Promise.all([
      db
        .select()
        .from(customerIdentitiesTable)
        .where(eq(customerIdentitiesTable.customerId, customer.id))
        .orderBy(customerIdentitiesTable.createdAt),
      db
        .select({
          tag: customerTagsTable,
          assignedAt: customerTagAssignmentsTable.assignedAt,
          assignedBy: customerTagAssignmentsTable.assignedBy,
        })
        .from(customerTagAssignmentsTable)
        .innerJoin(
          customerTagsTable,
          eq(customerTagAssignmentsTable.tagId, customerTagsTable.id),
        )
        .where(eq(customerTagAssignmentsTable.customerId, customer.id)),
    ]);

    return res.json({
      ...customer,
      identities,
      tags: tagAssignments.map((t) => ({ ...t.tag, assignedAt: t.assignedAt, assignedBy: t.assignedBy })),
    });
  },
);

// ─── UPDATE customer ──────────────────────────────────────────────────────────
router.patch(
  "/:id",
  requireAuth,
  requirePermission("customer:update"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const customer = await getCustomerOrFail(req.params.id, req.workspaceId!, res);
    if (!customer) return;

    const parsed = updateCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined) updateData[k] = v;
    }

    const [updated] = await db
      .update(customersTable)
      .set(updateData as any)
      .where(eq(customersTable.id, customer.id))
      .returning();

    await logActivity(customer.id, req.workspaceId!, "customer_updated", req.user!.id, req.user!.email, {
      changes: Object.keys(parsed.data),
    });

    return res.json(updated);
  },
);

// ─── DELETE customer (soft) ───────────────────────────────────────────────────
router.delete(
  "/:id",
  requireAuth,
  requirePermission("customer:delete"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const customer = await getCustomerOrFail(req.params.id, req.workspaceId!, res);
    if (!customer) return;

    await db
      .update(customersTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(customersTable.id, customer.id));

    await logActivity(customer.id, req.workspaceId!, "customer_deleted", req.user!.id, req.user!.email);

    return res.status(204).send();
  },
);

// ─── LIST identities ──────────────────────────────────────────────────────────
router.get(
  "/:id/identities",
  requireAuth,
  requirePermission("customer:view"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const customer = await getCustomerOrFail(req.params.id, req.workspaceId!, res);
    if (!customer) return;

    const identities = await db
      .select()
      .from(customerIdentitiesTable)
      .where(eq(customerIdentitiesTable.customerId, customer.id))
      .orderBy(customerIdentitiesTable.createdAt);

    return res.json(identities);
  },
);

// ─── ADD identity ─────────────────────────────────────────────────────────────
router.post(
  "/:id/identities",
  requireAuth,
  requirePermission("customer:update"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const customer = await getCustomerOrFail(req.params.id, req.workspaceId!, res);
    if (!customer) return;

    const parsed = addIdentitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
    }

    // If isPrimary, clear existing primary for that type
    if (parsed.data.isPrimary) {
      await db
        .update(customerIdentitiesTable)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(customerIdentitiesTable.customerId, customer.id),
            eq(customerIdentitiesTable.type, parsed.data.type),
          ),
        );
    }

    const [identity] = await db
      .insert(customerIdentitiesTable)
      .values({
        customerId: customer.id,
        workspaceId: req.workspaceId!,
        type: parsed.data.type,
        value: parsed.data.value,
        isPrimary: parsed.data.isPrimary ?? false,
        customLabel: parsed.data.customLabel,
        metadata: parsed.data.metadata ?? null,
      })
      .returning();

    await logActivity(customer.id, req.workspaceId!, "identity_added", req.user!.id, req.user!.email, {
      identityType: identity.type,
      identityId: identity.id,
    });

    return res.status(201).json(identity);
  },
);

// ─── REMOVE identity ──────────────────────────────────────────────────────────
router.delete(
  "/:id/identities/:identityId",
  requireAuth,
  requirePermission("customer:update"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const customer = await getCustomerOrFail(req.params.id, req.workspaceId!, res);
    if (!customer) return;

    const [identity] = await db
      .select()
      .from(customerIdentitiesTable)
      .where(
        and(
          eq(customerIdentitiesTable.id, req.params.identityId),
          eq(customerIdentitiesTable.customerId, customer.id),
        ),
      )
      .limit(1);

    if (!identity) return res.status(404).json({ error: "Identity not found" });

    await db
      .delete(customerIdentitiesTable)
      .where(eq(customerIdentitiesTable.id, identity.id));

    await logActivity(customer.id, req.workspaceId!, "identity_removed", req.user!.id, req.user!.email, {
      identityType: identity.type,
    });

    return res.status(204).send();
  },
);

// ─── TIMELINE ─────────────────────────────────────────────────────────────────
router.get(
  "/:id/timeline",
  requireAuth,
  requirePermission("customer:view"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const customer = await getCustomerOrFail(req.params.id, req.workspaceId!, res);
    if (!customer) return;

    const { page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const activities = await db
      .select()
      .from(customerActivitiesTable)
      .where(
        and(
          eq(customerActivitiesTable.customerId, customer.id),
          eq(customerActivitiesTable.workspaceId, req.workspaceId!),
        ),
      )
      .orderBy(desc(customerActivitiesTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    return res.json({ data: activities, page: pageNum, limit: limitNum, total: activities.length });
  },
);

// ─── LIST notes ───────────────────────────────────────────────────────────────
router.get(
  "/:id/notes",
  requireAuth,
  requirePermission("customer:view"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const customer = await getCustomerOrFail(req.params.id, req.workspaceId!, res);
    if (!customer) return;

    const notes = await db
      .select()
      .from(customerNotesTable)
      .where(
        and(
          eq(customerNotesTable.customerId, customer.id),
          isNull(customerNotesTable.deletedAt),
        ),
      )
      .orderBy(desc(customerNotesTable.isPinned), desc(customerNotesTable.createdAt));

    return res.json(notes);
  },
);

// ─── ADD note ─────────────────────────────────────────────────────────────────
router.post(
  "/:id/notes",
  requireAuth,
  requirePermission("customer:note"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const customer = await getCustomerOrFail(req.params.id, req.workspaceId!, res);
    if (!customer) return;

    const parsed = addNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
    }

    const [note] = await db
      .insert(customerNotesTable)
      .values({
        customerId: customer.id,
        workspaceId: req.workspaceId!,
        content: parsed.data.content,
        isPinned: parsed.data.isPinned ?? false,
        createdBy: req.user!.id,
        createdByName: req.user!.email,
      })
      .returning();

    await logActivity(customer.id, req.workspaceId!, "note_added", req.user!.id, req.user!.email, {
      noteId: note.id,
      isPinned: note.isPinned,
    });

    return res.status(201).json(note);
  },
);

// ─── UPDATE note ──────────────────────────────────────────────────────────────
router.patch(
  "/:id/notes/:noteId",
  requireAuth,
  requirePermission("customer:note"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const customer = await getCustomerOrFail(req.params.id, req.workspaceId!, res);
    if (!customer) return;

    const parsed = z.object({
      content: z.string().min(1).max(10000).optional(),
      isPinned: z.boolean().optional(),
    }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
    }

    const [existing] = await db
      .select()
      .from(customerNotesTable)
      .where(
        and(
          eq(customerNotesTable.id, req.params.noteId),
          eq(customerNotesTable.customerId, customer.id),
          isNull(customerNotesTable.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) return res.status(404).json({ error: "Note not found" });

    const [updated] = await db
      .update(customerNotesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(customerNotesTable.id, existing.id))
      .returning();

    return res.json(updated);
  },
);

// ─── DELETE note (soft) ───────────────────────────────────────────────────────
router.delete(
  "/:id/notes/:noteId",
  requireAuth,
  requirePermission("customer:note"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const customer = await getCustomerOrFail(req.params.id, req.workspaceId!, res);
    if (!customer) return;

    await db
      .update(customerNotesTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(customerNotesTable.id, req.params.noteId),
          eq(customerNotesTable.customerId, customer.id),
        ),
      );

    return res.status(204).send();
  },
);

// ─── ASSIGN tag ───────────────────────────────────────────────────────────────
router.post(
  "/:id/tags/:tagId",
  requireAuth,
  requirePermission("customer:tag"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const customer = await getCustomerOrFail(req.params.id, req.workspaceId!, res);
    if (!customer) return;

    const [tag] = await db
      .select()
      .from(customerTagsTable)
      .where(
        and(
          eq(customerTagsTable.id, req.params.tagId),
          eq(customerTagsTable.workspaceId, req.workspaceId!),
        ),
      )
      .limit(1);

    if (!tag) return res.status(404).json({ error: "Tag not found in this workspace" });

    const [assignment] = await db
      .insert(customerTagAssignmentsTable)
      .values({
        customerId: customer.id,
        tagId: tag.id,
        workspaceId: req.workspaceId!,
        assignedBy: req.user!.id,
      })
      .onConflictDoNothing()
      .returning();

    await logActivity(customer.id, req.workspaceId!, "tag_added", req.user!.id, req.user!.email, {
      tagId: tag.id,
      tagName: tag.name,
    });

    return res.status(201).json(assignment ?? { message: "Already assigned" });
  },
);

// ─── REMOVE tag ───────────────────────────────────────────────────────────────
router.delete(
  "/:id/tags/:tagId",
  requireAuth,
  requirePermission("customer:tag"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const customer = await getCustomerOrFail(req.params.id, req.workspaceId!, res);
    if (!customer) return;

    await db
      .delete(customerTagAssignmentsTable)
      .where(
        and(
          eq(customerTagAssignmentsTable.customerId, customer.id),
          eq(customerTagAssignmentsTable.tagId, req.params.tagId),
          eq(customerTagAssignmentsTable.workspaceId, req.workspaceId!),
        ),
      );

    await logActivity(customer.id, req.workspaceId!, "tag_removed", req.user!.id, req.user!.email, {
      tagId: req.params.tagId,
    });

    return res.status(204).send();
  },
);

// ─── MERGE customers ──────────────────────────────────────────────────────────
router.post(
  "/merge",
  requireAuth,
  requirePermission("customer:merge"),
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res) => {
    const workspaceId = req.workspaceId!;
    const parsed = mergeCustomersSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
    }
    const { primaryCustomerId, mergedCustomerId } = parsed.data;

    if (primaryCustomerId === mergedCustomerId) {
      return res.status(400).json({ error: "Cannot merge a customer with itself" });
    }

    const [primary, merged] = await Promise.all([
      db.select().from(customersTable)
        .where(and(eq(customersTable.id, primaryCustomerId), eq(customersTable.workspaceId, workspaceId), isNull(customersTable.deletedAt)))
        .limit(1).then((r) => r[0]),
      db.select().from(customersTable)
        .where(and(eq(customersTable.id, mergedCustomerId), eq(customersTable.workspaceId, workspaceId), isNull(customersTable.deletedAt)))
        .limit(1).then((r) => r[0]),
    ]);

    if (!primary) return res.status(404).json({ error: "Primary customer not found" });
    if (!merged) return res.status(404).json({ error: "Merged customer not found" });

    // Snapshot the merged customer before deletion
    const mergedIdentities = await db.select().from(customerIdentitiesTable)
      .where(eq(customerIdentitiesTable.customerId, mergedCustomerId));
    const mergedNotes = await db.select().from(customerNotesTable)
      .where(and(eq(customerNotesTable.customerId, mergedCustomerId), isNull(customerNotesTable.deletedAt)));
    const mergedTags = await db.select().from(customerTagAssignmentsTable)
      .where(eq(customerTagAssignmentsTable.customerId, mergedCustomerId));

    const snapshot = { customer: merged, identities: mergedIdentities, notes: mergedNotes, tags: mergedTags };

    // Re-assign identities from merged → primary (skip conflicts)
    for (const identity of mergedIdentities) {
      await db
        .insert(customerIdentitiesTable)
        .values({ ...identity, id: crypto.randomUUID(), customerId: primaryCustomerId })
        .onConflictDoNothing();
    }

    // Re-assign notes from merged → primary
    if (mergedNotes.length > 0) {
      await db.update(customerNotesTable)
        .set({ customerId: primaryCustomerId, updatedAt: new Date() })
        .where(eq(customerNotesTable.customerId, mergedCustomerId));
    }

    // Re-assign tags from merged → primary (skip conflicts)
    for (const ta of mergedTags) {
      await db
        .insert(customerTagAssignmentsTable)
        .values({ ...ta, id: crypto.randomUUID(), customerId: primaryCustomerId })
        .onConflictDoNothing();
    }

    // Re-assign activities from merged → primary
    await db.update(customerActivitiesTable)
      .set({ customerId: primaryCustomerId })
      .where(eq(customerActivitiesTable.customerId, mergedCustomerId));

    // Record merge history
    await db.insert(customerMergeHistoryTable).values({
      workspaceId,
      primaryCustomerId,
      mergedCustomerId,
      mergedBy: req.user!.id,
      snapshot,
    });

    // Soft-delete the merged customer
    await db.update(customersTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(customersTable.id, mergedCustomerId));

    await logActivity(primaryCustomerId, workspaceId, "customers_merged", req.user!.id, req.user!.email, {
      mergedCustomerId,
      mergedCustomerName: `${merged.firstName} ${merged.lastName ?? ""}`.trim(),
    });

    // Return updated primary customer
    const [updatedPrimary] = await db.select().from(customersTable)
      .where(eq(customersTable.id, primaryCustomerId)).limit(1);

    return res.json({ primary: updatedPrimary, mergedId: mergedCustomerId, snapshot: { id: mergedCustomerId } });
  },
);

export default router;
