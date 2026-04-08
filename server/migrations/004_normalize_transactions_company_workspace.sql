CREATE TABLE IF NOT EXISTS company_workspaces (
  username TEXT PRIMARY KEY REFERENCES users(username) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  pending_invoices INTEGER NOT NULL DEFAULT 0,
  pending_approvals INTEGER NOT NULL DEFAULT 0,
  payroll_total NUMERIC NOT NULL DEFAULT 0,
  payroll_run_date TIMESTAMPTZ NOT NULL,
  treasury_balance NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS account_transactions (
  username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  detail TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (username, account_id, id),
  FOREIGN KEY (username, account_id) REFERENCES accounts(username, id) ON DELETE CASCADE
);

INSERT INTO company_workspaces (
  username,
  company_name,
  pending_invoices,
  pending_approvals,
  payroll_total,
  payroll_run_date,
  treasury_balance
)
SELECT
  username,
  company_workspace->>'companyName',
  COALESCE((company_workspace->>'pendingInvoices')::integer, 0),
  COALESCE((company_workspace->>'pendingApprovals')::integer, 0),
  COALESCE((company_workspace->>'payrollTotal')::numeric, 0),
  COALESCE(NULLIF(company_workspace->>'payrollRunDate', '')::timestamptz, NOW()),
  COALESCE((company_workspace->>'treasuryBalance')::numeric, 0)
FROM workspaces
WHERE company_workspace IS NOT NULL
ON CONFLICT (username) DO NOTHING;

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
)
SELECT
  a.username,
  a.id,
  item->>'id',
  COALESCE(NULLIF(item->>'timestamp', '')::timestamptz, NOW()),
  item->>'title',
  COALESCE((item->>'amount')::numeric, 0),
  item->>'type',
  item->>'detail',
  ordinality::integer
FROM accounts a
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(a.transactions, '[]'::jsonb)) WITH ORDINALITY AS item(item, ordinality)
ON CONFLICT (username, account_id, id) DO NOTHING;

ALTER TABLE accounts DROP COLUMN IF EXISTS transactions;
ALTER TABLE workspaces DROP COLUMN IF EXISTS company_workspace;
