CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  login TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'parent')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'active')),
  created_by TEXT REFERENCES accounts(id),
  created_at TEXT NOT NULL,
  approved_at TEXT
);
CREATE INDEX accounts_created_by_idx ON accounts(created_by);
CREATE INDEX accounts_role_status_idx ON accounts(role, status);
