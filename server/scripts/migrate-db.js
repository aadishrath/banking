const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('../lib/load-env');

const defaultDatabaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/banking_app';
const databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl;
const migrationsDir = path.join(__dirname, '..', 'migrations');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.PGSSLMODE === 'require' || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const { rows } = await pool.query('SELECT id FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.id));
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      console.log(`Applied migration ${file}`);
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }
}

runMigrations()
  .then(() => {
    console.log('Database migrations are up to date.');
    return pool.end();
  })
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Database migration failed.');
    console.error(error);
    await pool.end().catch(() => {});
    process.exit(1);
  });
