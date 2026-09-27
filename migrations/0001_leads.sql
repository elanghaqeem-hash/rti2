-- RTI / Risetin production lead database
-- Apply to the Cloudflare D1 database bound as RTI_DB.
-- No sample rows are inserted by this migration.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL,
  tool_slug TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  sector TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  need_summary TEXT,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  status TEXT NOT NULL CHECK (
    status IN ('New', 'Qualified', 'Meeting', 'Proposal', 'Won', 'Lost')
  ),
  consent_at TEXT NOT NULL,
  consent_version TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at
  ON leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_status_created_at
  ON leads(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_email
  ON leads(email);
