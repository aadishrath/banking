const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('../lib/load-env');

const defaultDatabaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/banking_app';
const databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl;
const seedPath = path.join(__dirname, '..', 'data', 'db.json');
const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    process.env.PGSSLMODE === 'require' || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false
});

async function insertSeedWorkspace(client, username, workspace) {
  await client.query('INSERT INTO workspaces (username) VALUES ($1) ON CONFLICT (username) DO NOTHING', [username]);

  if (workspace.companyWorkspace) {
    await client.query(
      `
        INSERT INTO company_workspaces (
          username,
          company_name,
          pending_invoices,
          pending_approvals,
          payroll_total,
          payroll_run_date,
          treasury_balance
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
        ON CONFLICT (username) DO NOTHING
      `,
      [
        username,
        workspace.companyWorkspace.companyName,
        Number(workspace.companyWorkspace.pendingInvoices || 0),
        Number(workspace.companyWorkspace.pendingApprovals || 0),
        Number(workspace.companyWorkspace.payrollTotal || 0),
        workspace.companyWorkspace.payrollRunDate,
        Number(workspace.companyWorkspace.treasuryBalance || 0)
      ]
    );
  }

  for (const account of workspace.accounts || []) {
    await client.query(
      `
        INSERT INTO accounts (
          username,
          id,
          name,
          alias,
          kind,
          subtype,
          currency,
          balance,
          available,
          accent,
          status,
          last_four,
          apr,
          due_date
        ) VALUES (
          $1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
        ON CONFLICT (username, id) DO NOTHING
      `,
      [
        username,
        account.id,
        account.name,
        JSON.stringify(account.alias || []),
        account.kind,
        account.subtype,
        account.currency,
        Number(account.balance || 0),
        Number(account.available || 0),
        account.accent,
        account.status,
        account.lastFour,
        account.apr ?? null,
        account.dueDate || null
      ]
    );

    for (const [index, transaction] of (account.transactions || []).entries()) {
      await client.query(
        `
          INSERT INTO account_transactions (
            username,
            account_id,
            id,
            timestamp,
            title,
            amount,
            type,
            detail,
            sort_order
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
          )
          ON CONFLICT (username, account_id, id) DO NOTHING
        `,
        [
          username,
          account.id,
          transaction.id,
          transaction.timestamp,
          transaction.title,
          Number(transaction.amount || 0),
          transaction.type,
          transaction.detail,
          index
        ]
      );
    }
  }

  for (const entry of workspace.activity || []) {
    await client.query(
      `
        INSERT INTO activity_entries (
          username,
          id,
          timestamp,
          title,
          description,
          status,
          category,
          channel,
          amount,
          metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb
        )
        ON CONFLICT (username, id) DO NOTHING
      `,
      [
        username,
        entry.id,
        entry.timestamp,
        entry.title,
        entry.description,
        entry.status,
        entry.category,
        entry.channel,
        entry.amount ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null
      ]
    );
  }

  for (const message of workspace.chat || []) {
    await client.query(
      `
        INSERT INTO chat_messages (
          username,
          id,
          role,
          text,
          timestamp,
          status
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        )
        ON CONFLICT (username, id) DO NOTHING
      `,
      [username, message.id, message.role, message.text, message.timestamp, message.status]
    );
  }
}

async function repairNormalizedData() {
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    for (const [username, workspace] of Object.entries(seed.workspaces || {})) {
      await insertSeedWorkspace(client, username, workspace);
    }
    await client.query('COMMIT');
    console.log('Normalized workspace tables were repaired from seed data where rows were missing.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

repairNormalizedData()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Normalized data repair failed.');
    console.error(error);
    await pool.end().catch(() => {});
    process.exit(1);
  });
