import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { ZodError, z } from "zod";
import type { ServerConfig } from "./config.js";
import type { DatabasePool } from "./db/pool.js";
import { createSessionToken, hashSessionToken, validatePassword, verifyPassword, hashPassword } from "./auth/security.js";

type PilotRole = "employee" | "gip" | "director";

type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  avatarUrl: string | null;
  role: PilotRole;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

type SessionRow = {
  session_id: string;
  user_id: string;
  email: string;
  display_name: string;
  phone: string;
  avatar_url: string | null;
  role: PilotRole;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
};

const loginSchema = z.object({
  email: z.email().max(320).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});

const avatarSchema = z.string().max(800_000).refine(
  (value) => value === "" || /^https:\/\//i.test(value) || /^data:image\/(?:png|jpeg|webp);base64,/i.test(value),
  "Avatar must be an HTTPS URL or a PNG, JPEG, or WebP image.",
);

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(40).default(""),
  avatarUrl: z.union([avatarSchema, z.null()]).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(1).max(128),
});

const dummyPasswordHash = "$2b$12$Obx5b8bhdStTlpzVyhrcUO4KbqLmoHt2s8C1Vxzhk0bGQhPkwY6Jm";

export function buildServer(config: ServerConfig, pool: DatabasePool) {
  const app = Fastify({
    logger: {
      redact: ["req.headers.cookie", "req.body.password", "req.body.currentPassword", "req.body.newPassword"],
    },
    bodyLimit: 1_000_000,
    trustProxy: config.nodeEnv === "production",
  });

  void app.register(cookie);
  void app.register(helmet, { contentSecurityPolicy: false });
  void app.register(cors, {
    credentials: true,
    origin: config.corsOrigins,
  });
  void app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
  });

  app.addHook("onRequest", async (request, reply) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return;
    const origin = request.headers.origin;
    if (origin && !config.corsOrigins.includes(origin)) {
      return reply.code(403).send({ error: "origin_not_allowed" });
    }
  });

  app.get("/api/health/live", async () => ({ status: "ok" }));
  app.get("/api/health/ready", async (_request, reply) => {
    try {
      await pool.query("SELECT 1");
      return { status: "ready" };
    } catch {
      return reply.code(503).send({ status: "unavailable" });
    }
  });

  app.post("/api/auth/login", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const result = await pool.query<SessionRow & { password_hash: string }>(
      `SELECT
        u.id AS user_id,
        u.email,
        u.password_hash,
        u.display_name,
        u.phone,
        u.avatar_url,
        om.role,
        o.id AS organization_id,
        o.name AS organization_name,
        o.slug AS organization_slug,
        ''::text AS session_id
      FROM users u
      JOIN organization_memberships om ON om.user_id = u.id AND om.status = 'active'
      JOIN organizations o ON o.id = om.organization_id
      WHERE u.email = $1 AND u.status = 'active'
      ORDER BY CASE om.role WHEN 'director' THEN 1 WHEN 'gip' THEN 2 ELSE 3 END
      LIMIT 1`,
      [input.email],
    );
    const account = result.rows[0];
    const passwordMatches = await verifyPassword(input.password, account?.password_hash ?? dummyPasswordHash);
    if (!account || !passwordMatches) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }

    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + config.sessionTtlHours * 60 * 60 * 1000);
    const session = await pool.query<{ id: string }>(
      `INSERT INTO sessions (user_id, organization_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [account.user_id, account.organization_id, tokenHash, request.ip, request.headers["user-agent"] ?? null, expiresAt],
    );
    await writeAudit(pool, account.organization_id, account.user_id, "auth.login", "session", session.rows[0]?.id, {}, request.ip);

    reply.setCookie(config.sessionCookieName, token, cookieOptions(config, expiresAt));
    return { user: toPublicUser(account) };
  });

  app.get("/api/auth/me", async (request, reply) => {
    const session = await requireSession(request, reply, config, pool);
    if (!session) return;
    return { user: toPublicUser(session) };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const session = await requireSession(request, reply, config, pool);
    if (!session) return;
    await pool.query("UPDATE sessions SET revoked_at = now() WHERE id = $1", [session.session_id]);
    await writeAudit(pool, session.organization_id, session.user_id, "auth.logout", "session", session.session_id, {}, request.ip);
    reply.clearCookie(config.sessionCookieName, { path: "/" });
    return reply.code(204).send();
  });

  app.patch("/api/users/me", async (request, reply) => {
    const session = await requireSession(request, reply, config, pool);
    if (!session) return;
    const input = profileSchema.parse(request.body);
    const updated = await pool.query<Pick<SessionRow, "display_name" | "phone" | "avatar_url">>(
      `UPDATE users
       SET display_name = $2, phone = $3, avatar_url = $4
       WHERE id = $1
       RETURNING display_name, phone, avatar_url`,
      [session.user_id, input.name, input.phone, input.avatarUrl || null],
    );
    await writeAudit(pool, session.organization_id, session.user_id, "user.profile_updated", "user", session.user_id, {}, request.ip);
    return {
      user: toPublicUser({
        ...session,
        display_name: updated.rows[0]?.display_name ?? input.name,
        phone: updated.rows[0]?.phone ?? input.phone,
        avatar_url: updated.rows[0]?.avatar_url ?? null,
      }),
    };
  });

  app.post("/api/users/me/password", { config: { rateLimit: { max: 3, timeWindow: "15 minutes" } } }, async (request, reply) => {
    const session = await requireSession(request, reply, config, pool);
    if (!session) return;
    const input = passwordSchema.parse(request.body);
    const validationError = validatePassword(input.newPassword);
    if (validationError) {
      return reply.code(400).send({ error: "invalid_password", message: validationError });
    }
    const passwordResult = await pool.query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [session.user_id]);
    const matches = await verifyPassword(input.currentPassword, passwordResult.rows[0]?.password_hash ?? dummyPasswordHash);
    if (!matches) {
      return reply.code(400).send({ error: "invalid_current_password" });
    }
    const nextHash = await hashPassword(input.newPassword);
    await pool.query("UPDATE users SET password_hash = $2, password_changed_at = now() WHERE id = $1", [session.user_id, nextHash]);
    await pool.query("UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND id <> $2", [session.user_id, session.session_id]);
    await writeAudit(pool, session.organization_id, session.user_id, "user.password_changed", "user", session.user_id, {}, request.ip);
    return reply.code(204).send();
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: "invalid_request", details: error.issues });
    }
    request.log.error({ err: error }, "Unhandled request error");
    return reply.code(500).send({ error: "internal_error" });
  });

  app.addHook("onClose", async () => {
    await pool.end();
  });

  return app;
}

async function requireSession(request: FastifyRequest, reply: FastifyReply, config: ServerConfig, pool: DatabasePool) {
  const token = request.cookies[config.sessionCookieName];
  if (!token) {
    reply.code(401).send({ error: "authentication_required" });
    return null;
  }
  const result = await pool.query<SessionRow>(
    `SELECT
      s.id AS session_id,
      u.id AS user_id,
      u.email,
      u.display_name,
      u.phone,
      u.avatar_url,
      om.role,
      o.id AS organization_id,
      o.name AS organization_name,
      o.slug AS organization_slug
    FROM sessions s
    JOIN users u ON u.id = s.user_id AND u.status = 'active'
    JOIN organizations o ON o.id = s.organization_id
    JOIN organization_memberships om ON om.organization_id = s.organization_id AND om.user_id = s.user_id AND om.status = 'active'
    WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
    LIMIT 1`,
    [hashSessionToken(token)],
  );
  const session = result.rows[0];
  if (!session) {
    reply.clearCookie(config.sessionCookieName, { path: "/" });
    reply.code(401).send({ error: "authentication_required" });
    return null;
  }
  await pool.query("UPDATE sessions SET last_seen_at = now() WHERE id = $1 AND last_seen_at < now() - interval '5 minutes'", [session.session_id]);
  return session;
}

function toPublicUser(row: SessionRow): AuthenticatedUser {
  return {
    id: row.user_id,
    email: row.email,
    name: row.display_name,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    role: row.role,
    organization: {
      id: row.organization_id,
      name: row.organization_name,
      slug: row.organization_slug,
    },
  };
}

function cookieOptions(config: ServerConfig, expires: Date) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "strict" as const,
    secure: config.nodeEnv === "production",
    expires,
  };
}

async function writeAudit(
  pool: DatabasePool,
  organizationId: string,
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string | undefined,
  metadata: Record<string, unknown>,
  ipAddress: string,
) {
  await pool.query(
    `INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [organizationId, actorUserId, action, entityType, entityId ?? null, metadata, ipAddress],
  );
}
