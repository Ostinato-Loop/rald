import { pgTable, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "pending", "building", "deploying", "success", "failed", "rolled_back"
]);

export const deploymentsTable = pgTable("deployments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  product: text("product").notNull(),
  service: text("service").notNull(),
  status: deploymentStatusEnum("status").notNull().default("pending"),
  branch: text("branch").notNull().default("main"),
  commitSha: text("commit_sha").notNull(),
  commitMessage: text("commit_message"),
  triggeredBy: text("triggered_by").notNull(),
  duration: integer("duration"),
  cfDeploymentUrl: text("cf_deployment_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertDeploymentSchema = createInsertSchema(deploymentsTable).omit({ id: true, createdAt: true });
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deploymentsTable.$inferSelect;
