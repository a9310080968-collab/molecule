import "dotenv/config";
import { buildServer } from "./app.js";
import { readConfig } from "./config.js";
import { createPool } from "./db/pool.js";
const config = readConfig();
const pool = createPool(config);
const app = buildServer(config, pool);
try {
    await app.listen({ host: config.host, port: config.port });
}
catch (error) {
    app.log.error(error);
    process.exitCode = 1;
}
