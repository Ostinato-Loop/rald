import { db } from "@workspace/db";
import { notificationEventsTable } from "@workspace/db/schema";

export type EventType =
  | "CustomerCreated"
  | "CustomerUpdated"
  | "CustomerDeleted"
  | "CustomerMerged"
  | "CustomerTagged"
  | "CustomerNoteAdded"
  | "NotificationCreated"
  | "NotificationRead"
  | "NotificationDelivered"
  | "NotificationFailed";

export interface PublishEventOptions {
  workspaceId: string;
  eventType: EventType;
  aggregateType: string;
  aggregateId: string;
  actorId?: string;
  payload: Record<string, unknown>;
}

export async function publishEvent(opts: PublishEventOptions): Promise<void> {
  await db.insert(notificationEventsTable).values({
    workspaceId: opts.workspaceId,
    eventType: opts.eventType,
    aggregateType: opts.aggregateType,
    aggregateId: opts.aggregateId,
    actorId: opts.actorId,
    payload: opts.payload,
    publishedAt: new Date(),
  });
}
