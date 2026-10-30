ALTER TABLE accounts ADD COLUMN last_seen_at TEXT;
CREATE TABLE school_links (
  parent_id TEXT NOT NULL REFERENCES accounts(id),
  student_id TEXT NOT NULL REFERENCES accounts(id),
  teacher_id TEXT NOT NULL REFERENCES accounts(id),
  PRIMARY KEY (parent_id, student_id)
);
CREATE TABLE school_items (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  teacher_id TEXT NOT NULL REFERENCES accounts(id),
  student_id TEXT REFERENCES accounts(id),
  author_id TEXT NOT NULL REFERENCES accounts(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  due_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX school_items_teacher_idx ON school_items(teacher_id, created_at);
CREATE INDEX school_items_student_idx ON school_items(student_id, kind);
CREATE TABLE school_responses (
  item_id TEXT NOT NULL REFERENCES school_items(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (item_id, account_id)
);
