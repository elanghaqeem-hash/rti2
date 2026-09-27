-- RTI UU PDP Data Protection Readiness platform
-- Database-driven privacy diagnostic foundation for UU No. 27/2022.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  organization_size TEXT,
  employee_count INTEGER,
  data_subject_count INTEGER,
  customer_types_json TEXT NOT NULL DEFAULT '[]',
  operating_regions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pdp_regulations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  reference_code TEXT NOT NULL,
  version TEXT NOT NULL,
  effective_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  source_url TEXT,
  last_reviewed_at TEXT,
  reviewed_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pdp_regulation_articles (
  id TEXT PRIMARY KEY,
  regulation_id TEXT NOT NULL,
  article_reference TEXT NOT NULL,
  title TEXT,
  requirement_text TEXT NOT NULL,
  applicability_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (regulation_id) REFERENCES pdp_regulations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pdp_articles_regulation
  ON pdp_regulation_articles(regulation_id, article_reference);

CREATE TABLE IF NOT EXISTS pdp_domains (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0 CHECK (weight > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  version TEXT NOT NULL DEFAULT '1.0',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pdp_question_sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('quick','comprehensive')),
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  effective_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pdp_questions (
  id TEXT PRIMARY KEY,
  question_set_id TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  subdomain TEXT,
  question_text TEXT NOT NULL,
  question_help TEXT,
  regulation_reference TEXT,
  article_reference TEXT,
  control_objective TEXT,
  risk_statement TEXT,
  recommended_evidence TEXT,
  weight REAL NOT NULL DEFAULT 1.0 CHECK (weight > 0),
  criticality TEXT NOT NULL DEFAULT 'Medium' CHECK (criticality IN ('Low','Medium','High','Critical')),
  answer_type TEXT NOT NULL DEFAULT 'choice',
  answer_options_json TEXT NOT NULL DEFAULT '[]',
  branching_rule_json TEXT NOT NULL DEFAULT '{}',
  industry_applicability_json TEXT NOT NULL DEFAULT '[]',
  organization_size_json TEXT NOT NULL DEFAULT '[]',
  risk_trigger_json TEXT NOT NULL DEFAULT '{}',
  dpo_trigger_json TEXT NOT NULL DEFAULT '{}',
  dpia_trigger_json TEXT NOT NULL DEFAULT '{}',
  cross_border_trigger_json TEXT NOT NULL DEFAULT '{}',
  profile_requirements_json TEXT NOT NULL DEFAULT '{}',
  is_quick INTEGER NOT NULL DEFAULT 0 CHECK (is_quick IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version TEXT NOT NULL DEFAULT '1.0',
  effective_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (question_set_id) REFERENCES pdp_question_sets(id),
  FOREIGN KEY (domain_id) REFERENCES pdp_domains(id)
);

CREATE INDEX IF NOT EXISTS idx_pdp_questions_set_order
  ON pdp_questions(question_set_id, is_quick, sort_order);
CREATE INDEX IF NOT EXISTS idx_pdp_questions_domain
  ON pdp_questions(domain_id, status);

CREATE TABLE IF NOT EXISTS pdp_answer_options (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  score REAL,
  confidence_factor REAL NOT NULL DEFAULT 1.0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pdp_industry_packs (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  config_json TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pdp_assessments (
  id TEXT PRIMARY KEY,
  resume_token_hash TEXT NOT NULL,
  organization_id TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('quick','comprehensive')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','archived')),
  profile_json TEXT NOT NULL DEFAULT '{}',
  question_set_version TEXT NOT NULL,
  regulation_version TEXT NOT NULL,
  scoring_model_version TEXT NOT NULL,
  assessment_date TEXT NOT NULL,
  completion_date TEXT,
  result_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pdp_assessments_org
  ON pdp_assessments(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pdp_assessments_status
  ON pdp_assessments(status, updated_at);

CREATE TABLE IF NOT EXISTS pdp_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer_value TEXT,
  numeric_value REAL,
  text_value TEXT,
  confidence TEXT,
  evidence_status TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(assessment_id, question_id),
  FOREIGN KEY (assessment_id) REFERENCES pdp_assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES pdp_questions(id)
);

CREATE INDEX IF NOT EXISTS idx_pdp_responses_assessment
  ON pdp_responses(assessment_id);

CREATE TABLE IF NOT EXISTS pdp_evidences (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  question_id TEXT,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  scan_status TEXT NOT NULL DEFAULT 'pending',
  storage_status TEXT NOT NULL DEFAULT 'stored',
  uploaded_at TEXT NOT NULL,
  scanned_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (assessment_id) REFERENCES pdp_assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES pdp_questions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pdp_evidences_assessment
  ON pdp_evidences(assessment_id, uploaded_at);

CREATE TABLE IF NOT EXISTS pdp_risk_findings (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  domain_id TEXT,
  risk_event TEXT NOT NULL,
  cause TEXT,
  data_category TEXT,
  data_subject TEXT,
  impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
  likelihood INTEGER NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  inherent_risk INTEGER NOT NULL,
  existing_control TEXT,
  control_effectiveness TEXT,
  residual_risk INTEGER,
  regulatory_reference TEXT,
  recommended_action TEXT,
  priority TEXT,
  owner TEXT,
  target_date TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES pdp_assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (domain_id) REFERENCES pdp_domains(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pdp_recommendations (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  domain_id TEXT,
  category TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  priority TEXT NOT NULL,
  suggested_owner TEXT,
  target_window TEXT,
  service_mapping_code TEXT,
  requires_human_validation INTEGER NOT NULL DEFAULT 1 CHECK (requires_human_validation IN (0,1)),
  created_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES pdp_assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pdp_roadmap_items (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  objective TEXT NOT NULL,
  action TEXT NOT NULL,
  priority TEXT NOT NULL,
  owner TEXT,
  target_window TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES pdp_assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pdp_service_mappings (
  code TEXT PRIMARY KEY,
  trigger_type TEXT NOT NULL,
  trigger_value TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_url TEXT,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pdp_report_versions (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  report_version INTEGER NOT NULL,
  generated_at TEXT NOT NULL,
  checksum TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (assessment_id) REFERENCES pdp_assessments(id) ON DELETE CASCADE,
  UNIQUE(assessment_id, report_version)
);

CREATE TABLE IF NOT EXISTS pdp_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id TEXT,
  actor_type TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES pdp_assessments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pdp_audit_logs_assessment
  ON pdp_audit_logs(assessment_id, created_at);
