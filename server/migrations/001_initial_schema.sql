CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  password_hash TEXT NOT NULL,
  session_id TEXT,
  session_expires_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  lock_until TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS workspaces (
  username TEXT PRIMARY KEY REFERENCES users(username) ON DELETE CASCADE,
  accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  activity JSONB NOT NULL DEFAULT '[]'::jsonb,
  chat JSONB NOT NULL DEFAULT '[]'::jsonb,
  company_workspace JSONB
);
