import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Postgres connection.
 *
 * The connection is created lazily and cached on `globalThis`: in development
 * Next.js reloads modules on every edit, and a new pool per reload would exhaust
 * the database connections within minutes.
 */

export type Database = PostgresJsDatabase<typeof schema>;

type Connection = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  __bidSql?: Connection;
  __bidDb?: Database;
};

function readConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === "") {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  return url;
}

export function getDatabase(): Database {
  if (globalForDb.__bidDb) {
    return globalForDb.__bidDb;
  }

  const sql = postgres(readConnectionString(), {
    max: 10,
    // Postgres notices are noise in a web server log.
    onnotice: () => {},
  });

  const database = drizzle(sql, { schema });

  globalForDb.__bidSql = sql;
  globalForDb.__bidDb = database;

  return database;
}

/** Releases the pool. Used by CLI scripts so the process can exit. */
export async function closeDatabase(): Promise<void> {
  const sql = globalForDb.__bidSql;
  if (!sql) {
    return;
  }

  await sql.end({ timeout: 5 });
  globalForDb.__bidSql = undefined;
  globalForDb.__bidDb = undefined;
}
