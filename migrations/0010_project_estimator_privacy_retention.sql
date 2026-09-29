-- RTI Project Estimator & RFQ Builder v6.3
-- Privacy retention controls for abandoned/public estimator sessions.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS estimator_retention_runs (
  id TEXT PRIMARY KEY,
  cutoff_at TEXT NOT NULL,
  retention_days INTEGER NOT NULL,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  anonymized_count INTEGER NOT NULL DEFAULT 0,
  deleted_document_count INTEGER NOT NULL DEFAULT 0,
  deleted_attachment_count INTEGER NOT NULL DEFAULT 0,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO estimator_settings (key,label,value,is_public,updated_at) VALUES
  ('public_session_retention_days','Public abandoned estimator retention (days)','90',0,CURRENT_TIMESTAMP),
  ('external_ai_document_extraction','External AI extraction for PDF/image documents','disabled',0,CURRENT_TIMESTAMP);
