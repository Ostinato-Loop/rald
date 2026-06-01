import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  decimal,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

function generateCustomerId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "CUST-";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ─── Enums ────────────────────────────────────────────────────────────────────

export const customerStatusEnum = pgEnum("customer_status", [
  "active",
  "inactive",
  "blocked",
]);

export const identityTypeEnum = pgEnum("identity_type", [
  "email",
  "phone",
  "whatsapp",
  "instagram",
  "facebook",
  "website",
  "loop_messenger",
  "custom",
]);

// ─── customers ────────────────────────────────────────────────────────────────

export const customersTable = pgTable("customers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  raldCustomerId: text("rald_customer_id")
    .notNull()
    .unique()
    .$defaultFn(generateCustomerId),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  displayName: text("display_name"),
  email: text("email"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  status: customerStatusEnum("status").notNull().default("active"),
  source: text("source"),
  totalSpent: decimal("total_spent", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// ─── customer_identities ──────────────────────────────────────────────────────

export const customerIdentitiesTable = pgTable("customer_identities", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull(),
  type: identityTypeEnum("type").notNull(),
  value: text("value").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  customLabel: text("custom_label"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  unique("uq_identity_type_value_workspace").on(t.workspaceId, t.type, t.value),
]);

// ─── customer_activities ──────────────────────────────────────────────────────

export const customerActivitiesTable = pgTable("customer_activities", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull(),
  eventType: text("event_type").notNull(),
  actorId: text("actor_id"),
  actorName: text("actor_name"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── customer_notes ───────────────────────────────────────────────────────────

export const customerNotesTable = pgTable("customer_notes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull(),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// ─── customer_tags ────────────────────────────────────────────────────────────

export const customerTagsTable = pgTable("customer_tags", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  color: text("color"),
  description: text("description"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  unique("uq_tag_name_workspace").on(t.workspaceId, t.name),
]);

// ─── customer_tag_assignments ─────────────────────────────────────────────────

export const customerTagAssignmentsTable = pgTable("customer_tag_assignments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => customerTagsTable.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull(),
  assignedBy: text("assigned_by"),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
}, (t) => [
  unique("uq_tag_assignment").on(t.customerId, t.tagId),
]);

// ─── customer_merge_history ───────────────────────────────────────────────────

export const customerMergeHistoryTable = pgTable("customer_merge_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  primaryCustomerId: text("primary_customer_id").notNull(),
  mergedCustomerId: text("merged_customer_id").notNull(),
  mergedBy: text("merged_by").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Zod insert schemas & types ───────────────────────────────────────────────

export const insertCustomerSchema = createInsertSchema(customersTable).omit({
  id: true,
  raldCustomerId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;

export const insertCustomerIdentitySchema = createInsertSchema(customerIdentitiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomerIdentity = z.infer<typeof insertCustomerIdentitySchema>;
export type CustomerIdentity = typeof customerIdentitiesTable.$inferSelect;

export const insertCustomerNoteSchema = createInsertSchema(customerNotesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertCustomerNote = z.infer<typeof insertCustomerNoteSchema>;

export const insertCustomerTagSchema = createInsertSchema(customerTagsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomerTag = z.infer<typeof insertCustomerTagSchema>;
export type CustomerTag = typeof customerTagsTable.$inferSelect;

export type CustomerActivity = typeof customerActivitiesTable.$inferSelect;
export type CustomerMergeHistory = typeof customerMergeHistoryTable.$inferSelect;
