CREATE TABLE IF NOT EXISTS accounts (
  username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  alias JSONB NOT NULL DEFAULT '[]'::jsonb,
  kind TEXT NOT NULL,
  subtype TEXT NOT NULL,
  currency TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  available NUMERIC NOT NULL DEFAULT 0,
  accent TEXT NOT NULL,
  status TEXT NOT NULL,
  last_four TEXT NOT NULL,
  apr NUMERIC,
  due_date TIMESTAMPTZ,
  transactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (username, id)
);

CREATE TABLE IF NOT EXISTS activity_entries (
  username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  category TEXT NOT NULL,
  channel TEXT NOT NULL,
  amount NUMERIC,
  metadata JSONB,
  PRIMARY KEY (username, id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  id TEXT NOT NULL,
  role TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (username, id)
);

INSERT INTO accounts (
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
  due_date,
  transactions
)
SELECT
  item->>'id',
  w.username,
  item->>'name',
  COALESCE(item->'alias', '[]'::jsonb),
  item->>'kind',
  item->>'subtype',
  item->>'currency',
  COALESCE((item->>'balance')::numeric, 0),
  COALESCE((item->>'available')::numeric, 0),
  item->>'accent',
  item->>'status',
  item->>'lastFour',
  NULLIF(item->>'apr', '')::numeric,
  NULLIF(item->>'dueDate', '')::timestamptz,
  COALESCE(item->'transactions', '[]'::jsonb)
FROM workspaces w
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(w.accounts, '[]'::jsonb)) AS item
ON CONFLICT (username, id) DO NOTHING;

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
)
SELECT
  item->>'id',
  w.username,
  COALESCE(NULLIF(item->>'timestamp', '')::timestamptz, NOW()),
  item->>'title',
  item->>'description',
  item->>'status',
  item->>'category',
  item->>'channel',
  NULLIF(item->>'amount', '')::numeric,
  item->'metadata'
FROM workspaces w
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(w.activity, '[]'::jsonb)) AS item
ON CONFLICT (username, id) DO NOTHING;

INSERT INTO chat_messages (
  id,
  username,
  role,
  text,
  timestamp,
  status
)
SELECT
  item->>'id',
  w.username,
  item->>'role',
  item->>'text',
  COALESCE(NULLIF(item->>'timestamp', '')::timestamptz, NOW()),
  item->>'status'
FROM workspaces w
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(w.chat, '[]'::jsonb)) AS item
ON CONFLICT (username, id) DO NOTHING;

ALTER TABLE workspaces DROP COLUMN IF EXISTS accounts;
ALTER TABLE workspaces DROP COLUMN IF EXISTS activity;
ALTER TABLE workspaces DROP COLUMN IF EXISTS chat;
