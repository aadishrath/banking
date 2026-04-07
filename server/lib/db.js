const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const seedPath = path.join(__dirname, '..', 'data', 'db.json');
const defaultDatabaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/banking_app';
const databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl;
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.PGSSLMODE === 'require' || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

let initialized = false;

async function ensureDbReady() {
  if (initialized) {
    return;
  }

  await pool.query(`
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
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspaces (
      username TEXT PRIMARY KEY REFERENCES users(username) ON DELETE CASCADE,
      accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
      activity JSONB NOT NULL DEFAULT '[]'::jsonb,
      chat JSONB NOT NULL DEFAULT '[]'::jsonb,
      company_workspace JSONB
    );
  `);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  if (rows[0].count === 0) {
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
    await writeDb(seed);
  }

  initialized = true;
}

async function readDb() {
  await ensureDbReady();

  const userResult = await pool.query(`
    SELECT
      id,
      username,
      role,
      permissions,
      profile,
      password_hash,
      session_id,
      session_expires_at,
      last_login_at,
      failed_login_attempts,
      lock_until
    FROM users
    ORDER BY username ASC
  `);

  const workspaceResult = await pool.query(`
    SELECT username, accounts, activity, chat, company_workspace
    FROM workspaces
    ORDER BY username ASC
  `);

  return {
    users: userResult.rows.map((row) => ({
      id: row.id,
      username: row.username,
      role: row.role,
      permissions: row.permissions || [],
      profile: row.profile || {},
      passwordHash: row.password_hash,
      sessionId: row.session_id,
      sessionExpiresAt: row.session_expires_at ? new Date(row.session_expires_at).toISOString() : null,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
      failedLoginAttempts: Number(row.failed_login_attempts || 0),
      lockUntil: row.lock_until ? new Date(row.lock_until).toISOString() : null
    })),
    workspaces: Object.fromEntries(
      workspaceResult.rows.map((row) => [
        row.username,
        {
          accounts: row.accounts || [],
          activity: row.activity || [],
          chat: row.chat || [],
          companyWorkspace: row.company_workspace || null
        }
      ])
    )
  };
}

async function writeDb(db) {
  await ensureDbReady();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM workspaces');
    await client.query('DELETE FROM users');

    for (const user of db.users) {
      await client.query(
        `
          INSERT INTO users (
            id,
            username,
            role,
            permissions,
            profile,
            password_hash,
            session_id,
            session_expires_at,
            last_login_at,
            failed_login_attempts,
            lock_until
          ) VALUES (
            $1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10, $11
          )
        `,
        [
          user.id,
          user.username,
          user.role,
          JSON.stringify(user.permissions || []),
          JSON.stringify(user.profile || {}),
          user.passwordHash,
          user.sessionId || null,
          user.sessionExpiresAt || null,
          user.lastLoginAt || null,
          Number(user.failedLoginAttempts || 0),
          user.lockUntil || null
        ]
      );
    }

    for (const [username, workspace] of Object.entries(db.workspaces || {})) {
      await client.query(
        `
          INSERT INTO workspaces (
            username,
            accounts,
            activity,
            chat,
            company_workspace
          ) VALUES (
            $1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb
          )
        `,
        [
          username,
          JSON.stringify(workspace.accounts || []),
          JSON.stringify(workspace.activity || []),
          JSON.stringify(workspace.chat || []),
          workspace.companyWorkspace ? JSON.stringify(workspace.companyWorkspace) : null
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function sortByTimestamp(items) {
  return [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

module.exports = {
  ensureDbReady,
  readDb,
  writeDb,
  makeId,
  sortByTimestamp
};
