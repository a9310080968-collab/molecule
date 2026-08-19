import pg from "pg";
import type { ServerConfig } from "../config.js";

const { Pool } = pg;

export function createPool(config: ServerConfig) {
  return new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    ssl: config.databaseSsl ? { rejectUnauthorized: true } : false,
  });
}

export type DatabasePool = InstanceType<typeof Pool>;
