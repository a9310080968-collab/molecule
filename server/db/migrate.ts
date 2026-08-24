import "dotenv/config";
import { pathToFileURL } from "node:url";
import type { DatabasePool } from "./pool.js";
import { createPool } from "./pool.js";
import { migrations } from "./migrations/index.js";
import { readConfig } from "../config.js";

export async function runMigrations(pool: DatabasePool) {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('molecule_migrations'))");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const applied = await client.query<{ id: string }>("SELECT id FROM schema_migrations");
    const appliedIds = new Set(applied.rows.map((row) => row.id));
    for (const migration of migrations) {
      if (appliedIds.has(migration.id)) continue;
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [migration.id]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('molecule_migrations'))").catch(() => undefined);
    client.release();
  }
}

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const pool = createPool(readConfig());
  runMigrations(pool)
    .then(() => console.info("Database migrations applied."))
    .finally(() => pool.end());
}
