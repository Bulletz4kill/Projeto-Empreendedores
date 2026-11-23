CREATE TABLE institutions (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK(billing_cycle IN ('monthly','annual')),
  student_limit INTEGER NOT NULL DEFAULT 50,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  payment_option TEXT NOT NULL DEFAULT 'upfront' CHECK(payment_option IN ('upfront','installments')),
  pass_grade REAL NOT NULL DEFAULT 6,
  attendance_min REAL NOT NULL DEFAULT 75,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
ALTER TABLE accounts ADD COLUMN institution_id TEXT REFERENCES institutions(id);
ALTER TABLE accounts ADD COLUMN account_kind TEXT NOT NULL DEFAULT 'person';
CREATE TABLE classes (
  id TEXT PRIMARY KEY NOT NULL,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE class_members (
  class_id TEXT NOT NULL REFERENCES classes(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  PRIMARY KEY(class_id,account_id)
);
ALTER TABLE school_items ADD COLUMN institution_id TEXT REFERENCES institutions(id);
ALTER TABLE school_items ADD COLUMN class_id TEXT REFERENCES classes(id);
CREATE INDEX accounts_institution_idx ON accounts(institution_id,role);
CREATE INDEX classes_institution_idx ON classes(institution_id);
CREATE INDEX class_members_account_idx ON class_members(account_id);
CREATE INDEX items_class_idx ON school_items(institution_id,class_id,created_at);
