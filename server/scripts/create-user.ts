import "dotenv/config";
import { hashPassword, validatePassword } from "../auth/security.js";
import { readConfig } from "../config.js";
import { runMigrations } from "../db/migrate.js";
import { createPool } from "../db/pool.js";

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...parts] = argument.replace(/^--/, "").split("=");
    return [key, parts.join("=")];
  }),
);
const email = (args.get("email") ?? "").trim().toLowerCase();
const name = (args.get("name") ?? "").trim();
const role = args.get("role") ?? "employee";
const organizationSlug = args.get("org") ?? "pilot";
const organizationName = args.get("org-name") ?? "Molecule Pilot";
const password = process.env.MOLECULE_BOOTSTRAP_PASSWORD ?? "";

if (!email || !name || !["employee", "gip", "director"].includes(role)) {
  throw new Error("Usage: db:create-user -- --email=user@company.com --name=\"User Name\" --role=director [--org=pilot]");
}
const passwordError = validatePassword(password);
if (passwordError) {
  throw new Error(`Set MOLECULE_BOOTSTRAP_PASSWORD before creating the user. ${passwordError}`);
}

const pool = createPool(readConfig());
try {
  await runMigrations(pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const organization = await client.query<{ id: string }>(
      `INSERT INTO organizations (slug, name)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [organizationSlug, organizationName],
    );
    const passwordHash = await hashPassword(password);
    const user = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [email, passwordHash, name],
    );
    await client.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [organization.rows[0]?.id, user.rows[0]?.id, role],
    );
    await client.query("COMMIT");
    console.info(`Created ${role} account ${email} in organization ${organizationSlug}.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
