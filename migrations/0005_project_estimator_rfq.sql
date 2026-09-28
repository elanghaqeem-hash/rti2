-- RTI Project Estimator & RFQ Builder
-- Production SQLite schema + system configuration seed.
-- No transactional/customer/demo data is inserted by this migration.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  company_size TEXT,
  employee_count INTEGER,
  office_count INTEGER,
  location TEXT,
  country TEXT,
  website TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  name TEXT NOT NULL,
  title TEXT,
  department TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  preferred_channel TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS service_categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  base_effort_days REAL NOT NULL DEFAULT 5,
  base_price_min INTEGER NOT NULL DEFAULT 0,
  base_price_max INTEGER NOT NULL DEFAULT 0,
  billing_unit TEXT NOT NULL DEFAULT 'project',
  default_duration_min_weeks REAL NOT NULL DEFAULT 1,
  default_duration_max_weeks REAL NOT NULL DEFAULT 2,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES service_categories(id)
);

CREATE TABLE IF NOT EXISTS service_parameters (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'text',
  is_internal INTEGER NOT NULL DEFAULT 0 CHECK (is_internal IN (0,1)),
  updated_at TEXT NOT NULL,
  UNIQUE(service_id, key),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estimator_questions (
  id TEXT PRIMARY KEY,
  service_id TEXT,
  question_key TEXT NOT NULL,
  label TEXT NOT NULL,
  help_text TEXT,
  field_type TEXT NOT NULL CHECK (field_type IN ('text','number','currency','date','dropdown','multiselect','radio','checkbox','slider','file','textarea')),
  required INTEGER NOT NULL DEFAULT 0 CHECK (required IN (0,1)),
  complexity_dimension TEXT,
  weight REAL NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  quick_mode INTEGER NOT NULL DEFAULT 1 CHECK (quick_mode IN (0,1)),
  detailed_mode INTEGER NOT NULL DEFAULT 1 CHECK (detailed_mode IN (0,1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(service_id, question_key),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estimator_question_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 3,
  effort_multiplier REAL NOT NULL DEFAULT 1,
  price_multiplier REAL NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  UNIQUE(question_id, value),
  FOREIGN KEY (question_id) REFERENCES estimator_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estimator_question_conditions (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  source_question_key TEXT NOT NULL,
  operator TEXT NOT NULL,
  compare_value TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  FOREIGN KEY (question_id) REFERENCES estimator_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS complexity_weights (
  dimension TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pricing_parameters (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  value REAL NOT NULL,
  min_value REAL,
  max_value REAL,
  is_internal INTEGER NOT NULL DEFAULT 1 CHECK (is_internal IN (0,1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS estimator_rules (
  id TEXT PRIMARY KEY,
  service_id TEXT,
  name TEXT NOT NULL,
  condition_json TEXT NOT NULL DEFAULT '[]',
  effects_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estimator_settings (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0,1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS estimator_notification_templates (
  key TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('email','whatsapp','system')),
  subject TEXT,
  body TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resource_roles (
  id TEXT PRIMARY KEY,
  role_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  internal_day_rate INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS service_resource_defaults (
  service_id TEXT NOT NULL,
  resource_role_id TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  effort_share REAL NOT NULL DEFAULT 0,
  PRIMARY KEY(service_id, resource_role_id),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_role_id) REFERENCES resource_roles(id)
);

CREATE TABLE IF NOT EXISTS service_dependencies (
  service_id TEXT NOT NULL,
  related_service_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('requires','recommends')),
  reason TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  PRIMARY KEY(service_id, related_service_id, relation_type),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (related_service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estimator_sessions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('quick','detailed')),
  organization_id TEXT,
  contact_id TEXT,
  project_name TEXT,
  business_objectives_json TEXT NOT NULL DEFAULT '[]',
  selected_service_id TEXT,
  target_timeline TEXT,
  budget_expectation TEXT,
  source_context_json TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','estimated','rfq_draft','submitted','archived')),
  secure_token_hash TEXT,
  created_by TEXT,
  owner_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (selected_service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS estimator_answers (
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(session_id, question_id),
  FOREIGN KEY (session_id) REFERENCES estimator_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES estimator_questions(id)
);

CREATE TABLE IF NOT EXISTS estimator_events (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  rfq_id TEXT,
  event_type TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES estimator_sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS project_estimates (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  service_id TEXT NOT NULL,
  complexity_index REAL NOT NULL,
  complexity_level TEXT NOT NULL,
  project_size TEXT NOT NULL,
  effort_days REAL NOT NULL,
  duration_min_weeks REAL NOT NULL,
  duration_max_weeks REAL NOT NULL,
  price_min INTEGER NOT NULL,
  price_max INTEGER NOT NULL,
  readiness_score INTEGER NOT NULL,
  team_json TEXT NOT NULL DEFAULT '[]',
  factors_json TEXT NOT NULL DEFAULT '[]',
  recommendations_json TEXT NOT NULL DEFAULT '[]',
  trace_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  UNIQUE(session_id, version),
  FOREIGN KEY (session_id) REFERENCES estimator_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS estimate_commercials (
  estimate_id TEXT PRIMARY KEY,
  resource_cost INTEGER NOT NULL DEFAULT 0,
  third_party_cost INTEGER NOT NULL DEFAULT 0,
  license_cost INTEGER NOT NULL DEFAULT 0,
  travel_cost INTEGER NOT NULL DEFAULT 0,
  contingency_pct REAL NOT NULL DEFAULT 0,
  margin_pct REAL NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  tax_pct REAL NOT NULL DEFAULT 0,
  total_before_tax INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_quotation INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (estimate_id) REFERENCES project_estimates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estimate_items (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  label TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  internal_cost INTEGER,
  external_amount INTEGER,
  metadata_json TEXT,
  FOREIGN KEY (estimate_id) REFERENCES project_estimates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rfqs (
  id TEXT PRIMARY KEY,
  rfq_number TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL,
  estimate_id TEXT NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','presales_review','commercial_review','approved','proposal_preparation','closed')),
  created_by TEXT,
  owner_id TEXT,
  submitted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES estimator_sessions(id),
  FOREIGN KEY (estimate_id) REFERENCES project_estimates(id)
);

CREATE TABLE IF NOT EXISTS rfq_versions (
  id TEXT PRIMARY KEY,
  rfq_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  content_json TEXT NOT NULL,
  ai_assisted INTEGER NOT NULL DEFAULT 0 CHECK (ai_assisted IN (0,1)),
  ai_provider TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(rfq_id, version),
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rfq_attachments (
  id TEXT PRIMARY KEY,
  rfq_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  sha256 TEXT,
  scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending','clean','rejected','error')),
  uploaded_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  rfq_id TEXT NOT NULL UNIQUE,
  lead_id TEXT,
  organization_id TEXT,
  stage TEXT NOT NULL DEFAULT 'New RFQ',
  estimated_value_min INTEGER,
  estimated_value_max INTEGER,
  sales_owner TEXT,
  lost_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS lead_activities (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  note TEXT,
  actor TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  rfq_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  actor TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estimator_audit_logs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_estimator_sessions_token_hash ON estimator_sessions(secure_token_hash) WHERE secure_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_estimator_sessions_updated ON estimator_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_estimates_session ON project_estimates(session_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_rfqs_status_created ON rfqs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_service_order ON estimator_questions(service_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_services_category_active ON services(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_estimator_rules_service ON estimator_rules(service_id, sort_order, is_active);
CREATE INDEX IF NOT EXISTS idx_estimator_events_session ON estimator_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimator_events_type ON estimator_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_service ON service_dependencies(service_id, relation_type, sort_order);

-- Production configuration seed: RTI service catalog, not customer/demo transaction data.
INSERT OR IGNORE INTO service_categories (id, slug, name, description, sort_order, is_active, created_at, updated_at) VALUES
('cat-cyber','cybersecurity','Cybersecurity','Offensive, defensive, architecture and governance security services.',10,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cat-grc','grc','Governance, Risk & Compliance','Governance, risk, compliance, BCM, audit and policy services.',20,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cat-iso','iso','ISO & Certification Readiness','ISO readiness and implementation assistance.',30,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cat-privacy','data-protection','Data Protection','UU PDP, privacy governance, RoPA, DPIA and DPO advisory.',40,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cat-dev','software-development','Software Development','Enterprise web, mobile, API, integration and custom systems.',50,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cat-ai','ai-automation','AI & Automation','AI assistants, workflow automation and AI analytics.',60,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cat-advisory','technology-consulting','Technology Consulting','IT strategy, blueprint, enterprise architecture and transformation.',70,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cat-banking','banking-consulting','Banking & Financial Services Consulting','Risk, ICOFR, RCSA, KRI, audit and GRC implementation.',80,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cat-training','training','Training','Cybersecurity, ISO, risk, governance and custom corporate training.',90,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO services (id,category_id,slug,name,description,base_effort_days,base_price_min,base_price_max,billing_unit,default_duration_min_weeks,default_duration_max_weeks,is_active,created_at,updated_at) VALUES
('svc-vapt','cat-cyber','vapt','Vulnerability Assessment & Penetration Testing','Web, mobile, API and network VAPT with verification retest.',12,0,0,'project',2,4,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('svc-soc','cat-cyber','soc-mdr','SOC / MDR','Managed security monitoring, detection and response service.',30,0,0,'engagement',6,12,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('svc-cyber-gov','cat-grc','cybersecurity-governance','Cybersecurity Governance','Governance framework, policy, risk and control advisory.',25,0,0,'project',6,10,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('svc-iso27001','cat-iso','iso-27001','ISO/IEC 27001 Implementation Assistance','ISMS gap assessment, implementation assistance and certification preparation.',35,0,0,'project',10,20,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('svc-pdp','cat-privacy','uu-pdp-readiness','UU PDP Data Protection Readiness','Privacy governance, RoPA, DPIA, DPO advisory and remediation planning.',25,0,0,'project',6,12,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('svc-webapp','cat-dev','web-application','Enterprise Web Application','Custom responsive enterprise web application.',45,0,0,'project',10,20,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('svc-mobile','cat-dev','mobile-application','Mobile Application','Native or cross-platform enterprise mobile application.',50,0,0,'project',12,24,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('svc-integration','cat-dev','system-integration','System Integration','API, middleware and enterprise system integration.',35,0,0,'project',8,18,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('svc-ai-assistant','cat-ai','ai-assistant','Enterprise AI Assistant','Enterprise AI assistant, knowledge retrieval and workflow integration.',35,0,0,'project',8,18,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('svc-blueprint','cat-advisory','it-blueprint','IT Strategy & Blueprint','IT strategy, blueprint, architecture and transformation roadmap.',30,0,0,'project',8,14,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('svc-banking-grc','cat-banking','banking-grc','Banking GRC Implementation','Risk, compliance, ICOFR/RCSA/KRI and related GRC implementation.',40,0,0,'project',10,20,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('svc-training','cat-training','corporate-training','Custom Corporate Training','Customized corporate training and workshop delivery.',5,0,0,'batch',1,2,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO complexity_weights (dimension,label,weight,sort_order,is_active,updated_at) VALUES
('scope','Scope Complexity',1.2,10,1,CURRENT_TIMESTAMP),
('technology','Technology Complexity',1.0,20,1,CURRENT_TIMESTAMP),
('integration','Integration Complexity',1.1,30,1,CURRENT_TIMESTAMP),
('security','Security Complexity',1.0,40,1,CURRENT_TIMESTAMP),
('regulatory','Regulatory Complexity',1.0,50,1,CURRENT_TIMESTAMP),
('data','Data Complexity',0.8,60,1,CURRENT_TIMESTAMP),
('organization','Organization Complexity',0.8,70,1,CURRENT_TIMESTAMP),
('timeline','Timeline Pressure',1.0,80,1,CURRENT_TIMESTAMP),
('resource','Resource Complexity',0.7,90,1,CURRENT_TIMESTAMP),
('dependency','Dependency Complexity',0.7,100,1,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO pricing_parameters (key,label,value,min_value,max_value,is_internal,updated_at) VALUES
('complexity_multiplier_low','Low complexity multiplier',0.90,0.50,2.00,1,CURRENT_TIMESTAMP),
('complexity_multiplier_moderate','Moderate complexity multiplier',1.00,0.50,2.00,1,CURRENT_TIMESTAMP),
('complexity_multiplier_high','High complexity multiplier',1.20,0.50,3.00,1,CURRENT_TIMESTAMP),
('complexity_multiplier_very_high','Very high complexity multiplier',1.40,0.50,4.00,1,CURRENT_TIMESTAMP),
('accelerated_timeline_multiplier','Accelerated timeline multiplier',1.15,1.00,2.00,1,CURRENT_TIMESTAMP),
('price_range_spread','Public indicative range spread',0.15,0.05,0.50,1,CURRENT_TIMESTAMP);

-- Commercial values are intentionally not seeded. RTI Admin must calibrate official
-- service pricing before a public indicative investment can display a currency range.

INSERT OR IGNORE INTO estimator_settings (key,label,value,is_public,updated_at) VALUES
('rfq_prefix','RFQ number prefix','RTI-RFQ',0,CURRENT_TIMESTAMP),
('public_disclaimer','Public estimator disclaimer','This estimate is indicative and is generated based on information submitted by the user and configurable project estimation parameters. It is not a binding commercial offer. Final pricing, scope, timeline, technical architecture, resource allocation, tax treatment and contractual terms are subject to RTI review and formal quotation.',1,CURRENT_TIMESTAMP),
('whatsapp_number','RTI WhatsApp destination','',0,CURRENT_TIMESTAMP),
('whatsapp_url','RTI WhatsApp public URL','',1,CURRENT_TIMESTAMP),
('whatsapp_message_template','WhatsApp RFQ message','Hello RTI, I have completed Project Estimator. My RFQ reference is {{rfq_number}}. I would like to discuss the project.',1,CURRENT_TIMESTAMP),
('internal_rfq_email','Internal RFQ notification email','',0,CURRENT_TIMESTAMP),
('complexity_threshold_very_low','Complexity threshold - Very Low maximum','20',0,CURRENT_TIMESTAMP),
('complexity_threshold_low','Complexity threshold - Low maximum','40',0,CURRENT_TIMESTAMP),
('complexity_threshold_moderate','Complexity threshold - Moderate maximum','60',0,CURRENT_TIMESTAMP),
('complexity_threshold_high','Complexity threshold - High maximum','80',0,CURRENT_TIMESTAMP),
('project_size_micro_max_effort','Project size Micro max effort-days','5',0,CURRENT_TIMESTAMP),
('project_size_small_max_effort','Project size Small max effort-days','15',0,CURRENT_TIMESTAMP),
('project_size_medium_max_effort','Project size Medium max effort-days','35',0,CURRENT_TIMESTAMP),
('project_size_large_max_effort','Project size Large max effort-days','70',0,CURRENT_TIMESTAMP),
('readiness_required_weight','RFQ readiness required-answer weight','80',0,CURRENT_TIMESTAMP),
('readiness_profile_weight','RFQ readiness profile weight','20',0,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO estimator_notification_templates (key,channel,subject,body,is_active,updated_at) VALUES
('rfq_customer_confirmation','email','RTI RFQ {{rfq_number}} received','Thank you. RTI has received RFQ {{rfq_number}} for {{project_name}}. Our team will review the submitted scope before preparing any formal proposal or quotation.',1,CURRENT_TIMESTAMP),
('rfq_internal_alert','email','New RTI RFQ {{rfq_number}}','A new RFQ was submitted by {{company}} for {{service}}. Review the Project Estimator admin console for scope, indicative value, readiness and next actions.',1,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO estimator_rules (id,service_id,name,condition_json,effects_json,sort_order,is_active,updated_at) VALUES
('rule-vapt-large-auth','svc-vapt','Large authenticated VAPT scope','[{"field":"asset_volume","operator":"equals","value":"large"},{"field":"test_method","operator":"equals","value":"grey"}]','{"complexityDelta":8,"effortMultiplier":1.15,"priceMultiplier":1.10,"factor":"Large authenticated attack surface"}',10,1,CURRENT_TIMESTAMP),
('rule-dev-complex-integration','svc-webapp','Complex application integrations','[{"field":"integration_complexity","operator":"equals","value":"high"}]','{"complexityDelta":10,"effortMultiplier":1.20,"priceMultiplier":1.15,"factor":"Complex enterprise integrations"}',20,1,CURRENT_TIMESTAMP),
('rule-accelerated',NULL,'Accelerated delivery pressure','[{"field":"timeline_pressure","operator":"equals","value":"accelerated"}]','{"complexityDelta":8,"effortMultiplier":1.10,"priceMultiplier":1.15,"durationMultiplier":0.85,"factor":"Accelerated delivery timeline"}',30,1,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO resource_roles (id,role_key,name,internal_day_rate,is_active,updated_at) VALUES
('role-pm','project_manager','Project Manager',NULL,1,CURRENT_TIMESTAMP),
('role-ba','business_analyst','Business Analyst',NULL,1,CURRENT_TIMESTAMP),
('role-consultant','consultant','Consultant',NULL,1,CURRENT_TIMESTAMP),
('role-architect','solution_architect','Solution Architect',NULL,1,CURRENT_TIMESTAMP),
('role-security','security_consultant','Security Consultant',NULL,1,CURRENT_TIMESTAMP),
('role-pentester','pentester','Pentester',NULL,1,CURRENT_TIMESTAMP),
('role-dev','software_engineer','Software Engineer',NULL,1,CURRENT_TIMESTAMP),
('role-qa','qa_engineer','QA Engineer',NULL,1,CURRENT_TIMESTAMP),
('role-ai','ai_engineer','AI Engineer',NULL,1,CURRENT_TIMESTAMP),
('role-trainer','trainer','Trainer',NULL,1,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO service_resource_defaults (service_id,resource_role_id,quantity,effort_share) VALUES
('svc-vapt','role-pentester',2,0.75),('svc-vapt','role-pm',1,0.10),('svc-vapt','role-security',1,0.15),
('svc-iso27001','role-consultant',2,0.65),('svc-iso27001','role-pm',1,0.15),('svc-iso27001','role-security',1,0.20),
('svc-webapp','role-dev',3,0.60),('svc-webapp','role-architect',1,0.15),('svc-webapp','role-qa',1,0.15),('svc-webapp','role-pm',1,0.10),
('svc-ai-assistant','role-ai',2,0.45),('svc-ai-assistant','role-dev',2,0.30),('svc-ai-assistant','role-architect',1,0.15),('svc-ai-assistant','role-pm',1,0.10),
('svc-training','role-trainer',1,0.80),('svc-training','role-pm',1,0.20);

-- Common project questions apply to all services when service_id IS NULL.
INSERT OR IGNORE INTO estimator_questions (id,service_id,question_key,label,help_text,field_type,required,complexity_dimension,weight,sort_order,quick_mode,detailed_mode,is_active,created_at,updated_at) VALUES
('q-common-scope',NULL,'scope_scale','How broad is the project scope?','Choose the closest scope profile.','radio',1,'scope',1.2,10,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-common-timeline',NULL,'timeline_pressure','How urgent is the target delivery?','Accelerated delivery can increase delivery risk and effort.','radio',1,'timeline',1.0,20,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-common-regulatory',NULL,'regulatory_pressure','How significant are regulatory/compliance requirements?','Consider OJK, BI, BSSN, UU PDP, ISO or industry mandates.','radio',1,'regulatory',1.0,30,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-common-dependency',NULL,'external_dependencies','How many external dependencies are expected?','Examples: third parties, approvals, vendors or legacy systems.','radio',0,'dependency',0.8,40,0,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO estimator_question_options (id,question_id,value,label,score,effort_multiplier,price_multiplier,sort_order,is_active) VALUES
('qo-scope-1','q-common-scope','small','Focused / single workstream',2,0.85,0.90,10,1),
('qo-scope-2','q-common-scope','medium','Multiple workstreams / departments',3,1.00,1.00,20,1),
('qo-scope-3','q-common-scope','large','Enterprise-wide / multi-location',4,1.20,1.20,30,1),
('qo-scope-4','q-common-scope','critical','Mission-critical / national scale',5,1.40,1.40,40,1),
('qo-time-1','q-common-timeline','standard','Standard planning window',3,1.00,1.00,10,1),
('qo-time-2','q-common-timeline','accelerated','Accelerated / fixed near-term deadline',5,1.15,1.15,20,1),
('qo-time-3','q-common-timeline','flexible','Flexible timeline',2,0.95,0.95,30,1),
('qo-reg-1','q-common-regulatory','low','Low / no specific mandate',2,0.95,0.95,10,1),
('qo-reg-2','q-common-regulatory','moderate','Industry policy / customer requirement',3,1.00,1.00,20,1),
('qo-reg-3','q-common-regulatory','high','Regulator / certification / audit driven',5,1.20,1.20,30,1),
('qo-dep-1','q-common-dependency','low','0–2 external dependencies',2,0.95,0.95,10,1),
('qo-dep-2','q-common-dependency','medium','3–5 external dependencies',3,1.00,1.00,20,1),
('qo-dep-3','q-common-dependency','high','6+ or critical legacy dependencies',5,1.20,1.20,30,1);

INSERT OR IGNORE INTO estimator_questions (id,service_id,question_key,label,help_text,field_type,required,complexity_dimension,weight,sort_order,quick_mode,detailed_mode,is_active,created_at,updated_at) VALUES
('q-vapt-surface','svc-vapt','attack_surface','What should be tested?','Select the combined attack surface.','radio',1,'security',1.2,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-vapt-assets','svc-vapt','asset_volume','Approximate target volume','Use the closest range for apps/endpoints/IPs.','radio',1,'scope',1.2,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-vapt-auth','svc-vapt','test_method','Preferred testing method','Authenticated testing usually provides deeper coverage.','radio',1,'security',0.8,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-vapt-retest','svc-vapt','retest','Is verification retest required?','Retest is recommended after remediation.','checkbox',0,'resource',0.4,130,0,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-dev-modules','svc-webapp','module_complexity','Application functional complexity','Approximate number and complexity of modules/workflows.','radio',1,'technology',1.1,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-dev-integrations','svc-webapp','integration_complexity','Integration complexity','Consider APIs, core systems, payments, ERP and legacy platforms.','radio',1,'integration',1.2,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-dev-users','svc-webapp','user_scale','Expected user scale','Approximate active user population.','radio',1,'scope',0.8,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-dev-ai','svc-webapp','ai_requirement','AI or advanced analytics requirement','Select if AI/RAG/ML is within scope.','radio',0,'technology',0.9,130,0,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-dev-cloud','svc-webapp','cloud_required','Is cloud deployment in scope?','Enable to capture the target cloud environment.','checkbox',0,'technology',0.4,140,0,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-dev-cloud-provider','svc-webapp','cloud_provider','Target cloud provider','Shown only when cloud deployment is selected.','dropdown',1,'technology',0.5,150,0,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-iso-size','svc-iso27001','organization_scale','Organization / ISMS scope size','Approximate scope of people and locations.','radio',1,'organization',1.0,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-iso-maturity','svc-iso27001','isms_maturity','Current ISMS maturity','Select the closest current state.','radio',1,'regulatory',1.0,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-iso-target','svc-iso27001','certification_target','Certification target urgency','Select target horizon.','radio',1,'timeline',1.0,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-training-pax','svc-training','participant_scale','Number of participants','Select expected participant range.','radio',1,'scope',1.0,100,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-training-mode','svc-training','delivery_mode','Delivery mode','Online, onsite or hybrid.','radio',1,'resource',0.5,110,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('q-training-custom','svc-training','customization','Material customization level','Select standard or highly customized delivery.','radio',1,'scope',0.8,120,1,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO estimator_question_options (id,question_id,value,label,score,effort_multiplier,price_multiplier,sort_order,is_active) VALUES
('qo-vs-1','q-vapt-surface','web_api','Web application + API',3,1.00,1.00,10,1),
('qo-vs-2','q-vapt-surface','mobile','Mobile application',3,1.00,1.00,20,1),
('qo-vs-3','q-vapt-surface','network','Network infrastructure',3,1.00,1.00,30,1),
('qo-vs-4','q-vapt-surface','full','Web + mobile + API + network',5,1.50,1.50,40,1),
('qo-va-1','q-vapt-assets','small','Small: single app or <20 endpoints/IPs',2,0.80,0.85,10,1),
('qo-va-2','q-vapt-assets','medium','Medium: 20–60 endpoints/IPs',3,1.00,1.00,20,1),
('qo-va-3','q-vapt-assets','large','Large: >60 endpoints/IPs or ecosystem',5,1.40,1.45,30,1),
('qo-vm-1','q-vapt-auth','grey','Grey box / authenticated',3,1.00,1.00,10,1),
('qo-vm-2','q-vapt-auth','black','Black box',4,1.10,1.10,20,1),
('qo-vm-3','q-vapt-auth','white','White box + source/architecture review',5,1.35,1.35,30,1),
('qo-dm-1','q-dev-modules','small','1–3 core modules / simple workflow',2,0.80,0.85,10,1),
('qo-dm-2','q-dev-modules','medium','4–7 modules / multi-role workflow',3,1.00,1.00,20,1),
('qo-dm-3','q-dev-modules','large','8+ modules / complex multi-tenant engine',5,1.45,1.50,30,1),
('qo-di-1','q-dev-integrations','low','0–2 integrations',2,0.85,0.90,10,1),
('qo-di-2','q-dev-integrations','medium','3–5 integrations',3,1.00,1.00,20,1),
('qo-di-3','q-dev-integrations','high','6+ / legacy / event streaming',5,1.35,1.40,30,1),
('qo-du-1','q-dev-users','small','<500 users',2,0.90,0.90,10,1),
('qo-du-2','q-dev-users','medium','500–5,000 users',3,1.00,1.00,20,1),
('qo-du-3','q-dev-users','large','>5,000 / public scale',5,1.20,1.25,30,1),
('qo-dai-1','q-dev-ai','none','No AI requirement',2,1.00,1.00,10,1),
('qo-dai-2','q-dev-ai','rag','AI assistant / enterprise RAG',4,1.20,1.25,20,1),
('qo-dai-3','q-dev-ai','ml','Custom ML / predictive pipeline',5,1.40,1.50,30,1),
('qo-dcp-1','q-dev-cloud-provider','aws','AWS',3,1.00,1.00,10,1),
('qo-dcp-2','q-dev-cloud-provider','azure','Microsoft Azure',3,1.00,1.00,20,1),
('qo-dcp-3','q-dev-cloud-provider','gcp','Google Cloud',3,1.00,1.00,30,1),
('qo-dcp-4','q-dev-cloud-provider','private','Private cloud / on-premises cloud',4,1.10,1.10,40,1),
('qo-dcp-5','q-dev-cloud-provider','other','Other / to be confirmed',3,1.00,1.00,50,1),
('qo-is-1','q-iso-size','small','Single site / <100 employees',2,0.80,0.85,10,1),
('qo-is-2','q-iso-size','medium','100–500 employees / several functions',3,1.00,1.00,20,1),
('qo-is-3','q-iso-size','large','500+ / multi-site / complex scope',5,1.35,1.40,30,1),
('qo-im-1','q-iso-maturity','initial','Limited / ad hoc ISMS',5,1.35,1.35,10,1),
('qo-im-2','q-iso-maturity','developing','Policies/processes partly established',3,1.00,1.00,20,1),
('qo-im-3','q-iso-maturity','mature','Established ISMS requiring refinement',2,0.80,0.85,30,1),
('qo-it-1','q-iso-target','under3','<3 months',5,1.25,1.25,10,1),
('qo-it-2','q-iso-target','3to6','3–6 months',3,1.00,1.00,20,1),
('qo-it-3','q-iso-target','over6','>6 months',2,0.95,0.95,30,1),
('qo-tp-1','q-training-pax','small','1–15 participants',2,0.90,0.90,10,1),
('qo-tp-2','q-training-pax','medium','16–40 participants',3,1.00,1.00,20,1),
('qo-tp-3','q-training-pax','large','41+ participants',5,1.35,1.40,30,1),
('qo-tm-1','q-training-mode','online','Online',2,0.90,0.90,10,1),
('qo-tm-2','q-training-mode','onsite','Onsite',3,1.00,1.10,20,1),
('qo-tm-3','q-training-mode','hybrid','Hybrid / multi-location',5,1.20,1.25,30,1),
('qo-tc-1','q-training-custom','standard','Standard syllabus',2,0.90,0.90,10,1),
('qo-tc-2','q-training-custom','custom','Customized to organization',4,1.15,1.20,20,1),
('qo-tc-3','q-training-custom','lab','Customized + hands-on lab/case',5,1.30,1.35,30,1);


INSERT OR IGNORE INTO estimator_question_conditions
  (id, question_id, source_question_key, operator, compare_value, is_active)
VALUES
  ('cond-dev-cloud-provider','q-dev-cloud-provider','cloud_required','equals','true',1);


INSERT OR IGNORE INTO service_dependencies
  (service_id, related_service_id, relation_type, reason, sort_order, is_active)
VALUES
  ('svc-iso27001','svc-vapt','recommends','Technical security validation can support ISMS risk treatment and control assurance.',10,1),
  ('svc-iso27001','svc-training','recommends','Security awareness can support people-related ISMS controls and adoption.',20,1),
  ('svc-pdp','svc-cyber-gov','recommends','Privacy remediation may require security governance and control alignment.',10,1),
  ('svc-webapp','svc-vapt','recommends','Independent security testing is recommended before production release.',10,1);
