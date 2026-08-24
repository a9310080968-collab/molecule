import { z } from "zod";
const booleanFromString = z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true");
const environmentSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().min(1).default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.string().min(1),
    DATABASE_SSL: booleanFromString,
    CORS_ORIGIN: z.string().default("http://127.0.0.1:5173,http://localhost:5173"),
    SESSION_COOKIE_NAME: z.string().regex(/^[a-zA-Z0-9_-]+$/).default("molecule_session"),
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(12),
});
export function readConfig(environment = process.env) {
    const parsed = environmentSchema.parse(environment);
    return {
        nodeEnv: parsed.NODE_ENV,
        host: parsed.HOST,
        port: parsed.PORT,
        databaseUrl: parsed.DATABASE_URL,
        databaseSsl: parsed.DATABASE_SSL,
        corsOrigins: parsed.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean),
        sessionCookieName: parsed.SESSION_COOKIE_NAME,
        sessionTtlHours: parsed.SESSION_TTL_HOURS,
    };
}
