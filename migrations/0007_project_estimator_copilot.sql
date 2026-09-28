-- RTI Project Estimator & RFQ Builder v3
-- AI-assisted scoping audit/provenance layer.
-- No customer/demo content or commercial values are seeded.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS estimator_scope_provenance (
  session_id TEXT NOT NULL,
  question_key TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual','chat','document','inference','default')),
  evidence_json TEXT,
  confidence REAL NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('assumed','ai_extracted','confirmed')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (session_id, question_key),
  FOREIGN KEY (session_id) REFERENCES estimator_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estimator_scoping_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  tool_calls_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES estimator_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_estimator_scoping_messages_session
  ON estimator_scoping_messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS estimator_ai_audit_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  tool_iterations INTEGER NOT NULL DEFAULT 0,
  blocked_numbers_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES estimator_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_estimator_ai_audit_session
  ON estimator_ai_audit_logs(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS estimator_document_intake (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  storage_key TEXT,
  sha256 TEXT,
  parse_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (parse_status IN ('pending','stored','parsing','parsed','failed','blocked')),
  extracted_json TEXT,
  evidence_json TEXT,
  security_flags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES estimator_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_estimator_document_session
  ON estimator_document_intake(session_id, created_at DESC);

INSERT OR IGNORE INTO estimator_settings
  (key,label,value,is_public,updated_at)
VALUES
  ('copilot_enabled','AI Scoping Copilot enabled','true',1,CURRENT_TIMESTAMP),
  ('copilot_max_questions_per_turn','Copilot maximum questions per turn','3',0,CURRENT_TIMESTAMP),
  ('copilot_max_tool_iterations','Copilot maximum tool iterations','8',0,CURRENT_TIMESTAMP),
  ('copilot_primary_model_env','Primary model env key','AI_MODEL_PRIMARY',0,CURRENT_TIMESTAMP),
  ('copilot_fast_model_env','Fast model env key','AI_MODEL_FAST',0,CURRENT_TIMESTAMP);
