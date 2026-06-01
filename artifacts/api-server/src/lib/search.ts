import { db } from "@workspace/db";
import {
  customersTable,
  customerNotesTable,
  customerActivitiesTable,
  notificationsTable,
  workspacesTable,
} from "@workspace/db/schema";
import { eq, and, ilike, or, isNull, desc } from "drizzle-orm";

export type SearchIndex =
  | "customers"
  | "customer_notes"
  | "customer_activities"
  | "notifications"
  | "workspaces";

export interface SearchOptions {
  workspaceId: string;
  query: string;
  index: SearchIndex;
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
  index: SearchIndex;
}

export async function searchCustomers(
  workspaceId: string,
  query: string,
  limit = 20,
  offset = 0,
) {
  const pattern = `%${query}%`;
  const rows = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.workspaceId, workspaceId),
        isNull(customersTable.deletedAt),
        or(
          ilike(customersTable.firstName, pattern),
          ilike(customersTable.lastName, pattern),
          ilike(customersTable.displayName, pattern),
          ilike(customersTable.email, pattern),
          ilike(customersTable.phone, pattern),
          ilike(customersTable.raldCustomerId, pattern),
        ),
      ),
    )
    .orderBy(desc(customersTable.createdAt))
    .limit(limit)
    .offset(offset);
  return rows;
}

export async function searchCustomerNotes(
  workspaceId: string,
  query: string,
  limit = 20,
  offset = 0,
) {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(customerNotesTable)
    .where(
      and(
        eq(customerNotesTable.workspaceId, workspaceId),
        isNull(customerNotesTable.deletedAt),
        ilike(customerNotesTable.content, pattern),
      ),
    )
    .orderBy(desc(customerNotesTable.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function searchNotifications(
  workspaceId: string,
  userId: string,
  query: string,
  limit = 20,
  offset = 0,
) {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.workspaceId, workspaceId),
        eq(notificationsTable.userId, userId),
        or(
          ilike(notificationsTable.title, pattern),
          ilike(notificationsTable.body, pattern),
        ),
      ),
    )
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function globalSearch(
  workspaceId: string,
  userId: string,
  query: string,
  limit = 10,
) {
  const [customers, notes, notifications] = await Promise.all([
    searchCustomers(workspaceId, query, limit),
    searchCustomerNotes(workspaceId, query, limit),
    searchNotifications(workspaceId, userId, query, limit),
  ]);

  return {
    customers,
    customerNotes: notes,
    notifications,
    query,
    workspaceId,
  };
}
