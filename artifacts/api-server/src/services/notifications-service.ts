import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { logger } from "../lib/logger.js";

export async function createNotification(params: {
  clientId: string;
  type: string;
  title: string;
  message: string;
}): Promise<void> {
  try {
    await db.insert(notificationsTable).values({
      id:       uuidv4(),
      clientId: params.clientId,
      type:     params.type,
      title:    params.title,
      message:  params.message,
      isRead:   false,
    });
  } catch (err) {
    logger.error({ err }, "Failed to create notification");
  }
}
