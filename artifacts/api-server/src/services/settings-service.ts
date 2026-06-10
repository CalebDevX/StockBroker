import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function listSettings(): Promise<Record<string, unknown>> {
  const rows = await db
    .select({ key: settingsTable.key, value: settingsTable.value })
    .from(settingsTable);

  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function getSetting<T = unknown>(key: string, fallback: T): Promise<T> {
  const [row] = await db
    .select({ value: settingsTable.value })
    .from(settingsTable)
    .where(eq(settingsTable.key, key))
    .limit(1);

  return row ? (row.value as T) : fallback;
}

export async function upsertSetting(key: string, value: unknown): Promise<void> {
  await db.insert(settingsTable).values({
    id: uuidv4(),
    key,
    value,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: settingsTable.key,
    set: { value, updatedAt: new Date() },
  });
}
