import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const shouldDisableSslVerification = /(?:\?|&)sslmode=(?:require|prefer|allow)(?:&|$)/.test(
  process.env.DATABASE_URL,
);

if (shouldDisableSslVerification) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldDisableSslVerification ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
