import { pgTable, text, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const serviceStatusEnum = pgEnum("service_status", ["healthy", "degraded", "down", "deploying", "unknown"]);

export const servicesTable = pgTable("services", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: serviceStatusEnum("status").notNull().default("unknown"),
  product: text("product").notNull(),
  url: text("url").notNull(),
  version: text("version").notNull().default("v1.0.0"),
  region: text("region"),
  uptime: real("uptime"),
  responseTimeMs: real("response_time_ms"),
  lastDeployedAt: timestamp("last_deployed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertServiceSchema = createInsertSchema(servicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof servicesTable.$inferSelect;
