const { Pool } = require('pg');
require('./load-env');

const defaultDatabaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/banking_app';
const databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl;
const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    process.env.PGSSLMODE === 'require' || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false
});

let initialized = false;

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
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
  };
}

function mapTransactionRow(row) {
  return {
    id: row.id,
    timestamp: new Date(row.timestamp).toISOString(),
    title: row.title,
    amount: Number(row.amount),
    type: row.type,
    detail: row.detail
  };
}

function mapAccountRow(row, transactions) {
  return {
    id: row.id,
    name: row.name,
    alias: row.alias || [],
    kind: row.kind,
    subtype: row.subtype,
    currency: row.currency,
    balance: Number(row.balance),
    available: Number(row.available),
    accent: row.accent,
    status: row.status,
    lastFour: row.last_four,
    apr: row.apr == null ? undefined : Number(row.apr),
    dueDate: row.due_date ? new Date(row.due_date).toISOString() : undefined,
    transactions
  };
}

function mapActivityRow(row) {
  return {
    id: row.id,
    timestamp: new Date(row.timestamp).toISOString(),
    title: row.title,
    description: row.description,
    status: row.status,
    category: row.category,
    channel: row.channel,
    amount: row.amount == null ? undefined : Number(row.amount),
    metadata: row.metadata || undefined
  };
}

function mapChatRow(row) {
  return {
    id: row.id,
    role: row.role,
    text: row.text,
    timestamp: new Date(row.timestamp).toISOString(),
    status: row.status
  };
}

function mapCompanyWorkspaceRow(row) {
  if (!row) {
    return null;
  }

  return {
    companyName: row.company_name,
    pendingInvoices: Number(row.pending_invoices),
    pendingApprovals: Number(row.pending_approvals),
    payrollTotal: Number(row.payroll_total),
    payrollRunDate: new Date(row.payroll_run_date).toISOString(),
    treasuryBalance: Number(row.treasury_balance)
  };
}

function buildWorkspace(accountRows, transactionRows, activityRows, chatRows, companyWorkspaceRow) {
  if (
    !accountRows.length &&
    !activityRows.length &&
    !chatRows.length &&
    !companyWorkspaceRow
  ) {
    return null;
  }

  const transactionsByAccount = new Map();
  for (const row of transactionRows) {
    const key = row.account_id;
    const list = transactionsByAccount.get(key) || [];
    list.push(mapTransactionRow(row));
    transactionsByAccount.set(key, list);
  }

  return {
    accounts: accountRows.map((row) => mapAccountRow(row, transactionsByAccount.get(row.id) || [])),
    activity: activityRows.map(mapActivityRow),
    chat: chatRows.map(mapChatRow),
    companyWorkspace: mapCompanyWorkspaceRow(companyWorkspaceRow)
  };
}

function createStore(executor) {
  return {
    query(...args) {
      return executor.query(...args);
    },

    async getUserByUsername(username) {
      const { rows } = await executor.query(
        `
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
          WHERE username = $1
        `,
        [username]
      );
      return mapUserRow(rows[0]);
    },

    async getUserById(id) {
      const { rows } = await executor.query(
        `
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
          WHERE id = $1
        `,
        [id]
      );
      return mapUserRow(rows[0]);
    },

    async listUsersByRoles(roles) {
      const { rows } = await executor.query(
        `
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
          WHERE role = ANY($1::text[])
          ORDER BY username ASC
        `,
        [roles]
      );
      return rows.map(mapUserRow);
    },

    async countUsers() {
      const { rows } = await executor.query('SELECT COUNT(*)::int AS count FROM users');
      return rows[0].count;
    },

    async getWorkspaceByUsername(username) {
      const [accountResult, transactionResult, activityResult, chatResult, companyWorkspaceResult] =
        await Promise.all([
          executor.query(
            `
              SELECT
                id,
                username,
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
              FROM accounts
              WHERE username = $1
              ORDER BY name ASC
            `,
            [username]
          ),
          executor.query(
            `
              SELECT
                username,
                account_id,
                id,
                timestamp,
                title,
                amount,
                type,
                detail,
                sort_order
              FROM account_transactions
              WHERE username = $1
              ORDER BY account_id ASC, sort_order ASC, timestamp DESC
            `,
            [username]
          ),
          executor.query(
            `
              SELECT
                id,
                username,
                timestamp,
                title,
                description,
                status,
                category,
                channel,
                amount,
                metadata
              FROM activity_entries
              WHERE username = $1
              ORDER BY timestamp DESC
            `,
            [username]
          ),
          executor.query(
            `
              SELECT id, username, role, text, timestamp, status
              FROM chat_messages
              WHERE username = $1
              ORDER BY timestamp ASC
            `,
            [username]
          ),
          executor.query(
            `
              SELECT
                username,
                company_name,
                pending_invoices,
                pending_approvals,
                payroll_total,
                payroll_run_date,
                treasury_balance
              FROM company_workspaces
              WHERE username = $1
            `,
            [username]
          )
        ]);

      return buildWorkspace(
        accountResult.rows,
        transactionResult.rows,
        activityResult.rows,
        chatResult.rows,
        companyWorkspaceResult.rows[0]
      );
    },

    async upsertUser(user) {
      await executor.query(
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
          ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            role = EXCLUDED.role,
            permissions = EXCLUDED.permissions,
            profile = EXCLUDED.profile,
            password_hash = EXCLUDED.password_hash,
            session_id = EXCLUDED.session_id,
            session_expires_at = EXCLUDED.session_expires_at,
            last_login_at = EXCLUDED.last_login_at,
            failed_login_attempts = EXCLUDED.failed_login_attempts,
            lock_until = EXCLUDED.lock_until
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
    },

    async upsertWorkspace(username, workspace) {
      await executor.query('INSERT INTO workspaces (username) VALUES ($1) ON CONFLICT (username) DO NOTHING', [username]);

      if (workspace.companyWorkspace) {
        await executor.query(
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
            ON CONFLICT (username) DO UPDATE SET
              company_name = EXCLUDED.company_name,
              pending_invoices = EXCLUDED.pending_invoices,
              pending_approvals = EXCLUDED.pending_approvals,
              payroll_total = EXCLUDED.payroll_total,
              payroll_run_date = EXCLUDED.payroll_run_date,
              treasury_balance = EXCLUDED.treasury_balance
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
      } else {
        await executor.query('DELETE FROM company_workspaces WHERE username = $1', [username]);
      }

      await executor.query('DELETE FROM account_transactions WHERE username = $1', [username]);
      await executor.query('DELETE FROM accounts WHERE username = $1', [username]);
      for (const account of workspace.accounts || []) {
        await executor.query(
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
          await executor.query(
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

      await executor.query('DELETE FROM activity_entries WHERE username = $1', [username]);
      for (const entry of workspace.activity || []) {
        await executor.query(
          `
            INSERT INTO activity_entries (
              id,
              username,
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
          `,
          [
            entry.id,
            username,
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

      await executor.query('DELETE FROM chat_messages WHERE username = $1', [username]);
      for (const message of workspace.chat || []) {
        await executor.query(
          `
            INSERT INTO chat_messages (
              id,
              username,
              role,
              text,
              timestamp,
              status
            ) VALUES (
              $1, $2, $3, $4, $5, $6
            )
          `,
          [message.id, username, message.role, message.text, message.timestamp, message.status]
        );
      }
    },

    async deleteUserById(id) {
      await executor.query('DELETE FROM users WHERE id = $1', [id]);
    }
  };
}

const store = createStore(pool);

async function ensureDbReady() {
  if (initialized) {
    return;
  }

  await pool.query('SELECT 1');
  initialized = true;
}

async function withTransaction(run) {
  await ensureDbReady();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const txStore = createStore(client);
    const result = await run(txStore);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function readDb() {
  await ensureDbReady();

  const users = await store.listUsersByRoles(['admin', 'company', 'customer']);
  const workspaces = {};

  for (const user of users) {
    workspaces[user.username] = await store.getWorkspaceByUsername(user.username);
  }

  return {
    users,
    workspaces
  };
}

async function writeDb(db) {
  await withTransaction(async (tx) => {
    await tx.query('DELETE FROM chat_messages');
    await tx.query('DELETE FROM activity_entries');
    await tx.query('DELETE FROM account_transactions');
    await tx.query('DELETE FROM accounts');
    await tx.query('DELETE FROM company_workspaces');
    await tx.query('DELETE FROM workspaces');
    await tx.query('DELETE FROM users');

    for (const user of db.users) {
      await tx.upsertUser(user);
    }

    for (const [username, workspace] of Object.entries(db.workspaces || {})) {
      await tx.upsertWorkspace(username, workspace);
    }
  });
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function sortByTimestamp(items) {
  return [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

module.exports = {
  ensureDbReady,
  store,
  withTransaction,
  readDb,
  writeDb,
  makeId,
  sortByTimestamp
};
