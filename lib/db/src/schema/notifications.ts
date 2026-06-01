import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const notificationTypeEnum = pgEnum("notification_type", [
  "assignment",
  "invitation",
  "mention",
  "message",
  "booking",
  "customer_activity",
  "system_alert",
  "integration_alert",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "email",
  "sms",
  "push",
  "whatsapp",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "unread",
  "read",
  "archived",
  "dismissed",
]);

export const notificationPriorityEnum = pgEnum("notification_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "sent",
  "delivered",
  "failed",
  "retrying",
]);

// ─── notifications ────────────────────────────────────────────────────────────

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  type: notificationTypeEnum("type").notNull(),
  channel: notificationChannelEnum("channel").notNull().default("in_app"),
  priority: notificationPriorityEnum("priority").notNull().default("normal"),
  status: notificationStatusEnum("status").notNull().default("unread"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  metadata: jsonb("metadata"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  readAt: timestamp("read_at"),
  archivedAt: timestamp("archived_at"),
});

// ─── notification_templates ───────────────────────────────────────────────────

export const notificationTemplatesTable = pgTable("notification_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  type: notificationTypeEnum("type").notNull(),
  channel: notificationChannelEnum("channel").notNull(),
  titleTemplate: text("title_template").notNull(),
  bodyTemplate: text("body_template").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  variables: jsonb("variables"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  unique("uq_template_name_workspace").on(t.workspaceId, t.name),
]);

// ─── notification_preferences ─────────────────────────────────────────────────

export const notificationPreferencesTable = pgTable("notification_preferences", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id"),
  channel: notificationChannelEnum("channel").notNull(),
  type: notificationTypeEnum("type").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  unique("uq_preference_user_channel_type").on(t.workspaceId, t.userId, t.channel, t.type),
]);

// ─── notification_deliveries ──────────────────────────────────────────────────

export const notificationDeliveriesTable = pgTable("notification_deliveries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  notificationId: text("notification_id")
    .notNull()
    .references(() => notificationsTable.id, { onDelete: "cascade" }),
  channel: notificationChannelEnum("channel").notNull(),
  status: deliveryStatusEnum("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  deliveredAt: timestamp("delivered_at"),
  failureReason: text("failure_reason"),
  externalId: text("external_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── notification_events ──────────────────────────────────────────────────────

export const notificationEventsTable = pgTable("notification_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  eventType: text("event_type").notNull(),
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: text("aggregate_id").notNull(),
  actorId: text("actor_id"),
  payload: jsonb("payload").notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Zod insert schemas & types ───────────────────────────────────────────────

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({
  id: true,
  createdAt: true,
  readAt: true,
  archivedAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;
export type NotificationTemplate = typeof notificationTemplatesTable.$inferSelect;

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferencesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferencesTable.$inferSelect;

export const insertNotificationDeliverySchema = createInsertSchema(notificationDeliveriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNotificationDelivery = z.infer<typeof insertNotificationDeliverySchema>;
export type NotificationDelivery = typeof notificationDeliveriesTable.$inferSelect;

export type NotificationEvent = typeof notificationEventsTable.$inferSelect;
