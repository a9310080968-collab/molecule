export const initialMigration = {
    id: "001_initial",
    sql: String.raw `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    DO $$ BEGIN
      CREATE TYPE molecule_user_status AS ENUM ('active', 'invited', 'blocked');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE molecule_role AS ENUM ('employee', 'gip', 'director');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS organizations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
      name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL,
      password_hash text NOT NULL,
      display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 100),
      phone text NOT NULL DEFAULT '',
      avatar_url text,
      status molecule_user_status NOT NULL DEFAULT 'active',
      password_changed_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT users_email_normalized CHECK (email = lower(trim(email)))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

    CREATE TABLE IF NOT EXISTS organization_memberships (
      organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role molecule_role NOT NULL,
      status molecule_user_status NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (organization_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      token_hash char(64) NOT NULL UNIQUE,
      ip_address text,
      user_agent text,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS sessions_active_lookup ON sessions (token_hash, expires_at) WHERE revoked_at IS NULL;
    CREATE INDEX IF NOT EXISTS sessions_user_lookup ON sessions (user_id, expires_at);

    CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      external_id text NOT NULL,
      title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 240),
      snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
      revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      archived_at timestamptz,
      UNIQUE (organization_id, external_id)
    );

    CREATE TABLE IF NOT EXISTS project_memberships (
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      access_level text NOT NULL CHECK (access_level IN ('member', 'manager', 'owner')),
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
      actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      action text NOT NULL,
      entity_type text NOT NULL,
      entity_id text,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      ip_address text,
      occurred_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS audit_events_org_time ON audit_events (organization_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS audit_events_entity ON audit_events (entity_type, entity_id, occurred_at DESC);

    CREATE OR REPLACE FUNCTION molecule_set_updated_at()
    RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS organizations_set_updated_at ON organizations;
    CREATE TRIGGER organizations_set_updated_at BEFORE UPDATE ON organizations
      FOR EACH ROW EXECUTE FUNCTION molecule_set_updated_at();
    DROP TRIGGER IF EXISTS users_set_updated_at ON users;
    CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION molecule_set_updated_at();
    DROP TRIGGER IF EXISTS memberships_set_updated_at ON organization_memberships;
    CREATE TRIGGER memberships_set_updated_at BEFORE UPDATE ON organization_memberships
      FOR EACH ROW EXECUTE FUNCTION molecule_set_updated_at();
    DROP TRIGGER IF EXISTS projects_set_updated_at ON projects;
    CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON projects
      FOR EACH ROW EXECUTE FUNCTION molecule_set_updated_at();
  `,
};
