ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_pkey;
ALTER TABLE accounts ADD PRIMARY KEY (username, id);

ALTER TABLE activity_entries DROP CONSTRAINT IF EXISTS activity_entries_pkey;
ALTER TABLE activity_entries ADD PRIMARY KEY (username, id);

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_pkey;
ALTER TABLE chat_messages ADD PRIMARY KEY (username, id);
