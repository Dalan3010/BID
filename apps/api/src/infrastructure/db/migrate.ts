import { migrate } from "drizzle-orm/postgres-js/migrator";

import { closeDatabase, getDatabase } from "./client";

/**
 * Applies every pending SQL file in `drizzle/`.
 *
 * Drizzle records what has already run, so this is safe to call repeatedly and
 * on a database that is already up to date.
 */
async function main(): Promise<void> {
  const database = getDatabase();

  await migrate(database, { migrationsFolder: "./drizzle" });

  console.log("Migrations applied.");
}

main()
  .catch((error: unknown) => {
    console.error("Migration failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
