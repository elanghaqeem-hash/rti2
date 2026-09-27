-- RTI ISO/IEC 27001 Readiness Diagnostic Platform
-- Additive SQLite migration. No fake assessment/result data is inserted.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  sub_industry TEXT,
  country TEXT,
  employee_count INTEGER,
  location_count INTEGER,
  business_unit_count INTEGER,
  it_user_count INTEGER,
  cloud_status TEXT,
  cloud_provider TEXT,
  data_center TEXT,
  remote_working INTEGER NOT NULL DEFAULT 0 CHECK (remote_working IN (0,1)),
  outsourced_it INTEGER NOT NULL DEFAULT 0 CHECK (outsourced_it IN (0,1)),
  critical_third_parties TEXT,
  regulatory_environment TEXT,
  processes_personal_data INTEGER NOT NULL DEFAULT 0 CHECK (processes_personal_data IN (0,1)),
  has_soc INTEGER NOT NULL DEFAULT 0 CHECK (has_soc IN (0,1)),
  has_incident_response_team INTEGER NOT NULL DEFAULT 0 CHECK (has_incident_response_team IN (0,1)),
  has_bcp_drp INTEGER NOT NULL DEFAULT 0 CHECK (has_bcp_drp IN (0,1)),
  iso27001_certified INTEGER NOT NULL DEFAULT 0 CHECK (iso27001_certified IN (0,1)),
  target_certification TEXT,
  target_certification_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organization_memberships (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS assessment_templates (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  standard_version TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Draft','Review','Published','Archived')),
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(template_id, version)
);

CREATE TABLE IF NOT EXISTS assessment_sections (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_quick INTEGER NOT NULL DEFAULT 1 CHECK (is_quick IN (0,1)),
  UNIQUE(version_id, code)
);

CREATE TABLE IF NOT EXISTS assessment_questions (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES assessment_sections(id) ON DELETE CASCADE,
  question_code TEXT NOT NULL,
  clause_ref TEXT,
  domain TEXT NOT NULL,
  question_text TEXT NOT NULL,
  purpose TEXT,
  expected_evidence TEXT,
  risk_if_missing TEXT,
  recommendation TEXT,
  criticality TEXT NOT NULL DEFAULT 'Medium' CHECK (criticality IN ('Critical','High','Medium','Low')),
  weight REAL NOT NULL DEFAULT 1 CHECK (weight > 0),
  gate_key TEXT,
  is_quick INTEGER NOT NULL DEFAULT 1 CHECK (is_quick IN (0,1)),
  applicability_rule TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(version_id, question_code)
);

CREATE TABLE IF NOT EXISTS response_options (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  score REAL,
  is_na INTEGER NOT NULL DEFAULT 0 CHECK (is_na IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(version_id, value)
);

CREATE TABLE IF NOT EXISTS annex_controls (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  control_ref TEXT NOT NULL,
  domain TEXT NOT NULL,
  title TEXT NOT NULL,
  question_text TEXT NOT NULL,
  purpose TEXT,
  expected_evidence TEXT,
  risk_if_missing TEXT,
  recommendation TEXT,
  criticality TEXT NOT NULL DEFAULT 'Medium' CHECK (criticality IN ('Critical','High','Medium','Low')),
  weight REAL NOT NULL DEFAULT 1 CHECK (weight > 0),
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(version_id, control_ref)
);

CREATE TABLE IF NOT EXISTS maturity_levels (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  min_score REAL NOT NULL,
  max_score REAL NOT NULL,
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS scoring_rules (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  label TEXT NOT NULL,
  weight REAL NOT NULL,
  config_json TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  UNIQUE(version_id, rule_key)
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES assessment_templates(id),
  version_id TEXT NOT NULL REFERENCES assessment_versions(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  mode TEXT NOT NULL CHECK (mode IN ('quick','full')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','archived')),
  access_token_hash TEXT NOT NULL,
  scope_json TEXT NOT NULL DEFAULT '{}',
  assessment_consent INTEGER NOT NULL DEFAULT 0 CHECK (assessment_consent IN (0,1)),
  evidence_processing_consent INTEGER NOT NULL DEFAULT 0 CHECK (evidence_processing_consent IN (0,1)),
  ai_processing_consent INTEGER NOT NULL DEFAULT 0 CHECK (ai_processing_consent IN (0,1)),
  overall_score REAL,
  evidence_score REAL,
  governance_score REAL,
  audit_score REAL,
  readiness_level TEXT,
  gates_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  submitted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_assessments_org_updated ON assessments(organization_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_version_mode ON assessments(version_id, mode);

CREATE TABLE IF NOT EXISTS assessment_responses (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  target_ref TEXT NOT NULL,
  question_id TEXT REFERENCES assessment_questions(id) ON DELETE CASCADE,
  annex_control_id TEXT REFERENCES annex_controls(id) ON DELETE CASCADE,
  response_value INTEGER,
  is_na INTEGER NOT NULL DEFAULT 0 CHECK (is_na IN (0,1)),
  applicability_justification TEXT,
  evidence_status TEXT NOT NULL DEFAULT 'No Evidence',
  evidence_note TEXT,
  comment TEXT,
  assessor_note TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(assessment_id, target_ref),
  CHECK (
    (question_id IS NOT NULL AND annex_control_id IS NULL) OR
    (question_id IS NULL AND annex_control_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_assessment_responses_assessment ON assessment_responses(assessment_id);

CREATE TABLE IF NOT EXISTS evidence_files (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  target_ref TEXT,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  classification TEXT NOT NULL DEFAULT 'Confidential',
  retention_until TEXT,
  scan_status TEXT NOT NULL DEFAULT 'pending',
  uploader_label TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evidence_files_assessment ON evidence_files(assessment_id, created_at DESC);

CREATE TABLE IF NOT EXISTS control_applicability (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  annex_control_id TEXT NOT NULL REFERENCES annex_controls(id) ON DELETE CASCADE,
  applicable INTEGER NOT NULL CHECK (applicable IN (0,1)),
  justification TEXT NOT NULL,
  risk_reference TEXT,
  owner TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(assessment_id, annex_control_id)
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  target_ref TEXT NOT NULL,
  observation TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'rule-engine',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gap_register (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  target_ref TEXT NOT NULL,
  clause_control TEXT NOT NULL,
  finding TEXT NOT NULL,
  current_condition TEXT,
  expected_condition TEXT,
  evidence TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('Critical','High','Medium','Low')),
  risk TEXT,
  recommendation TEXT,
  action_owner TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Planned','In Progress','Remediated','Verified','Accepted')),
  generated_by TEXT NOT NULL DEFAULT 'rule-engine',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gap_register_assessment_severity ON gap_register(assessment_id, severity);

CREATE TABLE IF NOT EXISTS risks (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  asset_process TEXT NOT NULL,
  threat TEXT,
  vulnerability TEXT,
  impact INTEGER,
  likelihood INTEGER,
  inherent_risk INTEGER,
  controls TEXT,
  residual_risk INTEGER,
  risk_owner TEXT,
  treatment TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS remediation_actions (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  gap_id TEXT REFERENCES gap_register(id) ON DELETE SET NULL,
  action_text TEXT NOT NULL,
  owner TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'Open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roadmap_items (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  workstream TEXT NOT NULL,
  action_text TEXT NOT NULL,
  priority INTEGER NOT NULL,
  source_gap_id TEXT REFERENCES gap_register(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Planned',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_roadmap_assessment_phase ON roadmap_items(assessment_id, phase, priority);

CREATE TABLE IF NOT EXISTS recommendation_rules (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  match_key TEXT NOT NULL,
  severity TEXT,
  recommendation TEXT NOT NULL,
  service_code TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);

CREATE TABLE IF NOT EXISTS report_templates (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  header_text TEXT NOT NULL,
  footer_text TEXT NOT NULL,
  disclaimer_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS service_mappings (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  match_key TEXT NOT NULL,
  service_name TEXT NOT NULL,
  cta_parameter_key TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);

CREATE TABLE IF NOT EXISTS ai_provider_configuration (
  id TEXT PRIMARY KEY,
  provider_key TEXT NOT NULL UNIQUE,
  model_name TEXT,
  priority INTEGER NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 0 CHECK (is_enabled IN (0,1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  assessment_id TEXT REFERENCES assessments(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_assessment_created ON audit_logs(assessment_id, created_at DESC);

INSERT OR IGNORE INTO assessment_templates
(id, slug, name, standard_version, status, created_at, updated_at)
VALUES
('TPL-ISO27001', 'iso27001-readiness', 'RTI ISO/IEC 27001 Readiness Checklist', 'ISO/IEC 27001:2022 + Amd 1:2024', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO assessment_versions
(id, template_id, version, status, published_at, created_at, updated_at)
VALUES
('VER-ISO27001-2022-RTI-1', 'TPL-ISO27001', 'ISO27001-2022-RTI-v1.0', 'Published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO assessment_sections
(id, version_id, code, title, domain, sort_order, is_quick)
VALUES
('SEC-C4','VER-ISO27001-2022-RTI-1','C4','Context of the Organization','Clause 4',10,1),
('SEC-C5','VER-ISO27001-2022-RTI-1','C5','Leadership','Clause 5',20,1),
('SEC-C6','VER-ISO27001-2022-RTI-1','C6','Planning','Clause 6',30,1),
('SEC-C7','VER-ISO27001-2022-RTI-1','C7','Support','Clause 7',40,1),
('SEC-C8','VER-ISO27001-2022-RTI-1','C8','Operation','Clause 8',50,1),
('SEC-C9','VER-ISO27001-2022-RTI-1','C9','Performance Evaluation','Clause 9',60,1),
('SEC-C10','VER-ISO27001-2022-RTI-1','C10','Improvement','Clause 10',70,1),
('SEC-A5','VER-ISO27001-2022-RTI-1','A5','Organizational control theme','Annex A Organizational',80,1),
('SEC-A6','VER-ISO27001-2022-RTI-1','A6','People control theme','Annex A People',90,1),
('SEC-A7','VER-ISO27001-2022-RTI-1','A7','Physical control theme','Annex A Physical',100,1),
('SEC-A8','VER-ISO27001-2022-RTI-1','A8','Technological control theme','Annex A Technological',110,1);

INSERT OR IGNORE INTO response_options
(id, version_id, value, label, description, score, is_na, sort_order, status)
VALUES
('RO-0','VER-ISO27001-2022-RTI-1','0','Not Implemented','No defined process or control is operating.',0,0,0,'active'),
('RO-1','VER-ISO27001-2022-RTI-1','1','Initial / Ad Hoc','Activities may occur but are informal and inconsistent.',1,0,10,'active'),
('RO-2','VER-ISO27001-2022-RTI-1','2','Partially Implemented','Some elements exist but coverage or consistency is incomplete.',2,0,20,'active'),
('RO-3','VER-ISO27001-2022-RTI-1','3','Implemented','The process or control is operating.',3,0,30,'active'),
('RO-4','VER-ISO27001-2022-RTI-1','4','Implemented & Documented','Implementation is supported by documented evidence.',4,0,40,'active'),
('RO-5','VER-ISO27001-2022-RTI-1','5','Managed & Continually Improved','Implementation is measured, reviewed and improved.',5,0,50,'active'),
('RO-NA','VER-ISO27001-2022-RTI-1','NA','Not Applicable','Excluded only with a documented applicability justification.',NULL,1,60,'active');

INSERT OR IGNORE INTO maturity_levels
(id, version_id, label, min_score, max_score, sort_order, status)
VALUES
('ML-FOUND','VER-ISO27001-2022-RTI-1','Foundational',0,39.999,10,'active'),
('ML-DEV','VER-ISO27001-2022-RTI-1','Developing',40,59.999,20,'active'),
('ML-DEF','VER-ISO27001-2022-RTI-1','Defined',60,74.999,30,'active'),
('ML-ADV','VER-ISO27001-2022-RTI-1','Advanced Readiness',75,89.999,40,'active'),
('ML-HIGH','VER-ISO27001-2022-RTI-1','High Readiness',90,100,50,'active');

INSERT OR IGNORE INTO scoring_rules
(id, version_id, rule_key, label, weight, config_json, is_active)
VALUES
('SR-REQ','VER-ISO27001-2022-RTI-1','requirement_readiness','Requirement Readiness',0.45,'{"source":"questions"}',1),
('SR-CTRL','VER-ISO27001-2022-RTI-1','control_readiness','Control Readiness',0.30,'{"source":"annex_controls"}',1),
('SR-EVID','VER-ISO27001-2022-RTI-1','evidence_readiness','Evidence Readiness',0.15,'{"source":"evidence_status"}',1),
('SR-GOV','VER-ISO27001-2022-RTI-1','governance_readiness','Governance Readiness',0.05,'{"clauses":["4","5","6"]}',1),
('SR-AUDIT','VER-ISO27001-2022-RTI-1','audit_readiness','Audit Readiness',0.05,'{"clauses":["9","10"]}',1);

INSERT OR IGNORE INTO assessment_questions
(id,version_id,section_id,question_code,clause_ref,domain,question_text,purpose,expected_evidence,risk_if_missing,recommendation,criticality,weight,gate_key,is_quick,applicability_rule,sort_order,status,created_at,updated_at)
VALUES
('Q-C4-01','VER-ISO27001-2022-RTI-1','SEC-C4','C4-01','Clause 4','Context','Has the organization identified the internal and external conditions that can materially affect its information security management system?','Confirm that ISMS design reflects organizational context.','Context analysis, strategy or risk workshop records.','The ISMS may not address material business or threat drivers.','Document and periodically review relevant internal and external issues.','High',1,NULL,1,NULL,10,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C4-02','VER-ISO27001-2022-RTI-1','SEC-C4','C4-02','Clause 4','Context','Have relevant interested parties and their information security requirements been identified and maintained?','Confirm stakeholder and obligation awareness.','Interested-party register, contractual or regulatory requirements register.','Important obligations may be omitted from ISMS planning.','Maintain an interested-party and requirement register with owners.','High',1,NULL,1,NULL,20,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C4-03','VER-ISO27001-2022-RTI-1','SEC-C4','C4-03','Clause 4','Context','Has the organization assessed whether climate change is relevant to the ISMS context and whether interested parties have related requirements?','Address ISO management-system climate amendment without presuming materiality.','Documented relevance assessment and rationale.','A required context consideration may be undocumented.','Record Relevant, Not Relevant, or Not Yet Assessed with rationale and evidence.','Medium',1,NULL,1,NULL,30,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C4-04','VER-ISO27001-2022-RTI-1','SEC-C4','C4-04','Clause 4','Context','Is the proposed ISMS scope clearly defined across organizational units, locations, services, technology and interfaces?','Establish an auditable ISMS boundary.','Approved scope statement and boundary/interface inventory.','Ambiguous scope can undermine risk assessment and certification planning.','Define scope boundaries, exclusions, interfaces and dependencies.','Critical',1.5,'scope_defined',1,NULL,40,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C4-05','VER-ISO27001-2022-RTI-1','SEC-C4','C4-05','Clause 4','Context','Are ISMS processes, ownership and interactions defined and integrated with normal business management?','Confirm the management system operates as a coherent system.','ISMS process map, governance charter, RACI.','Disconnected activities may not operate consistently.','Document ISMS process ownership and interactions.','High',1,NULL,1,NULL,50,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

('Q-C5-01','VER-ISO27001-2022-RTI-1','SEC-C5','C5-01','Clause 5','Leadership','Can top management demonstrate active sponsorship and accountability for information security outcomes?','Assess leadership commitment.','Management directives, budget approvals, meeting records.','ISMS initiatives may lack authority and resources.','Establish visible executive sponsorship and recurring oversight.','Critical',1.4,NULL,1,NULL,60,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C5-02','VER-ISO27001-2022-RTI-1','SEC-C5','C5-02','Clause 5','Leadership','Is an approved information security policy available, communicated and periodically reviewed?','Confirm policy direction and governance.','Approved policy, communication evidence, review history.','Security expectations may be inconsistent or unauthorised.','Approve, communicate and schedule review of the information security policy.','Critical',1.5,'policies_available',1,NULL,70,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C5-03','VER-ISO27001-2022-RTI-1','SEC-C5','C5-03','Clause 5','Leadership','Are information security roles and responsibilities formally assigned to accountable owners?','Verify accountability.','RACI, job descriptions, committee charter.','Control ownership may be unclear.','Assign named owners for ISMS and key control areas.','High',1,NULL,1,NULL,80,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C5-04','VER-ISO27001-2022-RTI-1','SEC-C5','C5-04','Clause 5','Leadership','Do assigned security roles have sufficient authority and escalation paths to perform their responsibilities?','Check practical governance effectiveness.','Delegation letters, escalation matrix, governance charter.','Owners may be unable to enforce required actions.','Define decision rights and escalation paths.','High',1,NULL,1,NULL,90,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C5-05','VER-ISO27001-2022-RTI-1','SEC-C5','C5-05','Clause 5','Leadership','Are adequate resources and management attention allocated to priority ISMS activities?','Assess resourcing.','Budget, staffing plan, delivery roadmap.','Critical remediation may remain unfunded or delayed.','Align ISMS resources with risk and certification milestones.','High',1,NULL,1,NULL,100,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

('Q-C6-01','VER-ISO27001-2022-RTI-1','SEC-C6','C6-01','Clause 6','Planning','Is a documented information security risk assessment methodology defined and consistently applied?','Assess repeatability of risk analysis.','Risk methodology, scoring criteria, procedure.','Risk decisions may be inconsistent and unauditable.','Define risk identification, analysis, evaluation and review methodology.','Critical',1.5,NULL,1,NULL,110,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C6-02','VER-ISO27001-2022-RTI-1','SEC-C6','C6-02','Clause 6','Planning','Has an information security risk assessment been completed for the proposed ISMS scope and kept current?','Confirm scoped risk understanding.','Risk register, assessment records, review date.','Material risks may be unidentified or untreated.','Complete and approve a scoped information security risk assessment.','Critical',1.6,'risk_assessment_available',1,NULL,120,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C6-03','VER-ISO27001-2022-RTI-1','SEC-C6','C6-03','Clause 6','Planning','Are risk acceptance criteria and decision authorities explicitly defined?','Check consistent risk acceptance.','Risk appetite/criteria and approval matrix.','Residual risk may be accepted inconsistently.','Define risk acceptance thresholds and approval authorities.','High',1,NULL,1,NULL,130,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C6-04','VER-ISO27001-2022-RTI-1','SEC-C6','C6-04','Clause 6','Planning','Is there an approved risk treatment plan with owners, actions and target dates for material risks?','Assess treatment planning.','Risk treatment plan and progress tracking.','Known risks may remain untreated without accountability.','Create and track treatment actions tied to risk owners.','Critical',1.6,'risk_treatment_available',1,NULL,140,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C6-05','VER-ISO27001-2022-RTI-1','SEC-C6','C6-05','Clause 6','Planning','Is a current Statement of Applicability available with documented inclusion or exclusion rationale for relevant controls?','Assess control selection traceability.','Statement of Applicability or draft SoA register.','Control decisions may not be traceable to risks and obligations.','Build and validate an SoA linked to risks, obligations and implementation evidence.','Critical',1.7,'soa_available',1,NULL,150,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

('Q-C7-01','VER-ISO27001-2022-RTI-1','SEC-C7','C7-01','Clause 7','Support','Are sufficient people, tools and budget available to establish, operate and improve the ISMS?','Assess support capacity.','Resource plan, budget, tooling inventory.','ISMS operation may be unsustainable.','Close priority capacity and tooling gaps.','High',1,NULL,1,NULL,160,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C7-02','VER-ISO27001-2022-RTI-1','SEC-C7','C7-02','Clause 7','Support','Are competence requirements defined and evidenced for personnel performing information security responsibilities?','Assess competence assurance.','Competency matrix, certifications, training records.','Control performance may depend on unverified capability.','Define competence criteria and close identified capability gaps.','Medium',1,NULL,1,NULL,170,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C7-03','VER-ISO27001-2022-RTI-1','SEC-C7','C7-03','Clause 7','Support','Is security awareness delivered, measured and refreshed based on role and risk?','Assess awareness effectiveness.','Campaign records, completion metrics, phishing or knowledge results.','Human-related risks may remain unmanaged.','Implement role-based awareness with measurable outcomes.','High',1,NULL,1,NULL,180,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C7-04','VER-ISO27001-2022-RTI-1','SEC-C7','C7-04','Clause 7','Support','Are internal and external ISMS communications defined, including what, when, by whom and to whom?','Assess communication governance.','Communication plan, escalation and notification matrix.','Important information may not reach the right parties.','Document recurring, incident and regulatory communication requirements.','Medium',1,NULL,1,NULL,190,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C7-05','VER-ISO27001-2022-RTI-1','SEC-C7','C7-05','Clause 7','Support','Is documented information controlled so that approved versions and reliable operating evidence can be retrieved?','Assess evidence integrity and document control.','Document register, approval history, retention rules, records.','Audit evidence may be incomplete, outdated or untraceable.','Implement controlled document lifecycle and evidence retention.','Critical',1.5,'evidence_available',1,NULL,200,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

('Q-C8-01','VER-ISO27001-2022-RTI-1','SEC-C8','C8-01','Clause 8','Operation','Are operational ISMS activities planned, controlled and supported by defined criteria?','Assess operational discipline.','Operating procedures, schedules, control records.','Required controls may operate inconsistently.','Define operational criteria, owners and retained evidence.','High',1,NULL,1,NULL,210,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C8-02','VER-ISO27001-2022-RTI-1','SEC-C8','C8-02','Clause 8','Operation','Are risk assessments repeated when significant changes or new risks affect the ISMS scope?','Assess risk lifecycle integration.','Change records and refreshed risk assessments.','Changes can introduce unmanaged security exposure.','Trigger reassessment based on defined change and review criteria.','High',1,NULL,1,NULL,220,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C8-03','VER-ISO27001-2022-RTI-1','SEC-C8','C8-03','Clause 8','Operation','Are selected security controls operating across the intended scope rather than existing only as documented designs?','Distinguish design from operational implementation.','Control operation records, configurations, tickets, logs.','Certification preparation may overstate implemented controls.','Validate operating implementation and evidence for selected controls.','Critical',1.7,'controls_operating',1,NULL,230,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C8-04','VER-ISO27001-2022-RTI-1','SEC-C8','C8-04','Clause 8','Operation','Are risk treatment actions tracked through completion and residual risk decisions recorded?','Assess treatment execution.','Action tracker, residual risk approvals.','Treatment plans may not translate into effective remediation.','Track treatment progress and formally approve residual risk.','High',1.2,NULL,1,NULL,240,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C8-05','VER-ISO27001-2022-RTI-1','SEC-C8','C8-05','Clause 8','Operation','Are security requirements controlled when processes, suppliers, technology or operating conditions change?','Assess operational change control.','Change approvals, supplier reviews, security acceptance records.','Uncontrolled change may bypass required security controls.','Embed security review and evidence into change and supplier processes.','High',1,NULL,1,NULL,250,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

('Q-C9-01','VER-ISO27001-2022-RTI-1','SEC-C9','C9-01','Clause 9','Performance Evaluation','Are meaningful ISMS objectives, indicators and measurement methods defined?','Assess performance visibility.','Objectives, KPI/KRI catalogue, measurement plan.','Management may lack evidence of ISMS effectiveness.','Define measurable objectives and decision-useful metrics.','Medium',1,NULL,1,NULL,260,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C9-02','VER-ISO27001-2022-RTI-1','SEC-C9','C9-02','Clause 9','Performance Evaluation','Are security and ISMS performance data monitored at planned intervals?','Assess monitoring execution.','Dashboards, monitoring reports, metric records.','Emerging deterioration may go unnoticed.','Establish monitoring cadence and accountable review.','High',1,NULL,1,NULL,270,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C9-03','VER-ISO27001-2022-RTI-1','SEC-C9','C9-03','Clause 9','Performance Evaluation','Are monitoring results analysed and used to evaluate ISMS effectiveness and required actions?','Assess use of measurement.','Analysis reports, action minutes, trend reviews.','Metrics may exist without driving decisions.','Link performance analysis to corrective and improvement actions.','Medium',1,NULL,1,NULL,280,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C9-04','VER-ISO27001-2022-RTI-1','SEC-C9','C9-04','Clause 9','Performance Evaluation','Has an internal ISMS audit been completed or formally scheduled with sufficient independence and scope coverage?','Assess audit readiness.','Audit programme, plan, workpapers, report.','Stage audit may identify issues not detected internally.','Complete an independent internal audit and track findings.','Critical',1.7,'internal_audit_completed',1,NULL,290,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C9-05','VER-ISO27001-2022-RTI-1','SEC-C9','C9-05','Clause 9','Performance Evaluation','Has management review been completed or scheduled with the required ISMS performance and decision inputs?','Assess management review readiness.','Agenda, pack, minutes, decisions and actions.','Top management review evidence may be unavailable.','Conduct management review and retain decisions and follow-up actions.','Critical',1.7,'management_review_completed',1,NULL,300,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

('Q-C10-01','VER-ISO27001-2022-RTI-1','SEC-C10','C10-01','Clause 10','Improvement','Are ISMS nonconformities and significant control failures consistently recorded and assigned?','Assess issue capture.','Nonconformity/finding register, incident or audit records.','Recurring issues may remain unmanaged.','Maintain a single traceable register of ISMS nonconformities and owners.','High',1,NULL,1,NULL,310,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C10-02','VER-ISO27001-2022-RTI-1','SEC-C10','C10-02','Clause 10','Improvement','Is root-cause analysis used proportionately for material or recurring nonconformities?','Assess quality of corrective action.','RCA records, problem-management analysis.','Symptoms may be fixed while underlying causes remain.','Use structured root-cause methods for material or recurring issues.','Medium',1,NULL,1,NULL,320,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C10-03','VER-ISO27001-2022-RTI-1','SEC-C10','C10-03','Clause 10','Improvement','Are corrective actions implemented, verified for effectiveness and closed with evidence?','Assess remediation governance.','Corrective action records, closure evidence, verification.','Findings may be closed without proven effectiveness.','Require evidence-based closure and effectiveness verification.','Critical',1.6,'corrective_actions_managed',1,NULL,330,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C10-04','VER-ISO27001-2022-RTI-1','SEC-C10','C10-04','Clause 10','Improvement','Does the organization maintain a continual improvement mechanism for the ISMS?','Assess sustained improvement.','Improvement backlog, review outcomes, roadmap changes.','ISMS maturity may stagnate after initial implementation.','Maintain an improvement backlog linked to risk and performance data.','Medium',1,NULL,1,NULL,340,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-C10-05','VER-ISO27001-2022-RTI-1','SEC-C10','C10-05','Clause 10','Improvement','Are lessons from incidents, audits, exercises and changes translated into updated controls or practices?','Assess learning loop.','Lessons-learned records and resulting updates.','Known weaknesses may recur.','Formalize lessons learned and trace them to implemented improvements.','High',1,NULL,1,NULL,350,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),

('Q-A5-01','VER-ISO27001-2022-RTI-1','SEC-A5','A5-THEME','Annex A','Organizational','At an executive level, are organizational security controls selected, owned, implemented and supported by evidence in proportion to risk and obligations?','Quick-scan the organizational control theme.','SoA, governance records, supplier/risk/policy evidence.','Governance control gaps may affect multiple security outcomes.','Prioritize organizational controls based on risk, obligations and evidence gaps.','High',1.2,NULL,1,NULL,360,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-A6-01','VER-ISO27001-2022-RTI-1','SEC-A6','A6-THEME','Annex A','Are people-related security controls applied through the workforce lifecycle and supported by competence, awareness and responsibility evidence?','Quick-scan the people control theme.','HR security procedures, awareness and responsibility records.','Human-factor risk may remain unmanaged.','Strengthen lifecycle people controls and measurable awareness evidence.','High',1.2,NULL,1,NULL,370,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-A7-01','VER-ISO27001-2022-RTI-1','SEC-A7','A7-THEME','Annex A','Are physical security controls proportionate to locations, assets and information sensitivity, with operating evidence?','Quick-scan the physical control theme.','Physical access, visitor, facility and monitoring records.','Physical compromise may bypass technical safeguards.','Validate physical controls against site and asset risk.','Medium',1.1,NULL,1,NULL,380,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('Q-A8-01','VER-ISO27001-2022-RTI-1','SEC-A8','A8-THEME','Annex A','Are technological security controls configured, monitored and maintained with evidence that they operate as intended?','Quick-scan the technological control theme.','Configurations, logs, vulnerability, access, backup and monitoring evidence.','Technical controls may exist without effective operation.','Prioritize technical control validation and evidence collection.','High',1.3,NULL,1,NULL,390,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n < 37)
INSERT OR IGNORE INTO annex_controls
(id,version_id,control_ref,domain,title,question_text,purpose,expected_evidence,risk_if_missing,recommendation,criticality,weight,sort_order,status)
SELECT
  'CTRL-A5-' || printf('%02d',n),
  'VER-ISO27001-2022-RTI-1',
  'A.5.' || n,
  'Organizational',
  'Organizational control ' || 'A.5.' || n,
  'Has the organization defined, implemented and retained appropriate evidence for the security outcome associated with control ' || 'A.5.' || n || '?',
  'Assess applicability and evidenced implementation without reproducing licensed standard text.',
  'Policy, procedure, register, record or other evidence relevant to this control.',
  'A relevant organizational security outcome may be unmanaged or insufficiently evidenced.',
  'Confirm applicability, define the required outcome, implement proportionate measures and retain evidence.',
  CASE WHEN n IN (1,2,7,8,15,19,23,24,26,28,29,30,31,34,35,36,37) THEN 'High' ELSE 'Medium' END,
  1,
  500+n,
  'active'
FROM seq;

WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n < 8)
INSERT OR IGNORE INTO annex_controls
(id,version_id,control_ref,domain,title,question_text,purpose,expected_evidence,risk_if_missing,recommendation,criticality,weight,sort_order,status)
SELECT
  'CTRL-A6-' || printf('%02d',n),
  'VER-ISO27001-2022-RTI-1',
  'A.6.' || n,
  'People',
  'People control ' || 'A.6.' || n,
  'Has the organization defined, implemented and retained appropriate evidence for the people-security outcome associated with control ' || 'A.6.' || n || '?',
  'Assess applicability and evidenced implementation without reproducing licensed standard text.',
  'Role, HR, awareness, confidentiality or workforce lifecycle evidence relevant to this control.',
  'A relevant people-security outcome may be unmanaged or insufficiently evidenced.',
  'Confirm applicability, define the required outcome, implement proportionate measures and retain evidence.',
  'High',
  1,
  600+n,
  'active'
FROM seq;

WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n < 14)
INSERT OR IGNORE INTO annex_controls
(id,version_id,control_ref,domain,title,question_text,purpose,expected_evidence,risk_if_missing,recommendation,criticality,weight,sort_order,status)
SELECT
  'CTRL-A7-' || printf('%02d',n),
  'VER-ISO27001-2022-RTI-1',
  'A.7.' || n,
  'Physical',
  'Physical control ' || 'A.7.' || n,
  'Has the organization defined, implemented and retained appropriate evidence for the physical-security outcome associated with control ' || 'A.7.' || n || '?',
  'Assess applicability and evidenced implementation without reproducing licensed standard text.',
  'Facility, access, visitor, asset, environmental or monitoring evidence relevant to this control.',
  'A relevant physical-security outcome may be unmanaged or insufficiently evidenced.',
  'Confirm applicability, define the required outcome, implement proportionate measures and retain evidence.',
  CASE WHEN n IN (1,2,4,5) THEN 'High' ELSE 'Medium' END,
  1,
  700+n,
  'active'
FROM seq;

WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n < 34)
INSERT OR IGNORE INTO annex_controls
(id,version_id,control_ref,domain,title,question_text,purpose,expected_evidence,risk_if_missing,recommendation,criticality,weight,sort_order,status)
SELECT
  'CTRL-A8-' || printf('%02d',n),
  'VER-ISO27001-2022-RTI-1',
  'A.8.' || n,
  'Technological',
  'Technological control ' || 'A.8.' || n,
  'Has the organization defined, implemented, monitored and retained appropriate evidence for the technological-security outcome associated with control ' || 'A.8.' || n || '?',
  'Assess applicability and evidenced implementation without reproducing licensed standard text.',
  'Configuration, access, logging, vulnerability, backup, monitoring, development or other technical evidence relevant to this control.',
  'A relevant technological-security outcome may be unmanaged or insufficiently evidenced.',
  'Confirm applicability, implement proportionate technical measures, validate operation and retain evidence.',
  CASE WHEN n IN (2,5,7,8,9,12,13,15,16,20,24,25,26,28,32) THEN 'High' ELSE 'Medium' END,
  1,
  800+n,
  'active'
FROM seq;

INSERT OR IGNORE INTO recommendation_rules
(id,version_id,match_key,severity,recommendation,service_code,is_active)
VALUES
('REC-IA','VER-ISO27001-2022-RTI-1','internal_audit_completed','Critical','Complete an independent ISMS internal audit and evidence-based remediation cycle.','iso27001-internal-audit',1),
('REC-AWARE','VER-ISO27001-2022-RTI-1','C7-03','High','Strengthen role-based security awareness and measurable learning outcomes.','security-awareness',1),
('REC-RISK','VER-ISO27001-2022-RTI-1','risk_assessment_available','Critical','Establish a repeatable ISMS risk assessment and risk treatment workshop.','iso27001-risk-workshop',1),
('REC-TECH','VER-ISO27001-2022-RTI-1','A8-THEME','High','Validate technical controls and evidence through a focused cybersecurity technical assessment.','cybersecurity-technical-assessment',1);

INSERT OR IGNORE INTO report_templates
(id,version_id,name,header_text,footer_text,disclaimer_text,status)
VALUES
('RPT-ISO27001-1','VER-ISO27001-2022-RTI-1','RTI ISO/IEC 27001 Readiness Assessment',
'PT Riset Teknologi Indonesia | ISO/IEC 27001 Readiness Assessment',
'Confidential | Generated through RTI ISO/IEC 27001 Readiness Diagnostic Tool',
'This assessment is a diagnostic readiness tool provided by PT Riset Teknologi Indonesia. It does not constitute ISO certification, certification-body audit results, legal advice, or a guarantee that an organization will obtain certification. Final certification decisions remain with the appointed accredited certification body.',
'active');

INSERT OR IGNORE INTO service_mappings
(id,version_id,match_key,service_name,cta_parameter_key,is_active)
VALUES
('SVC-ISO-IMPL','VER-ISO27001-2022-RTI-1','Critical','ISO/IEC 27001 Implementation Support','ISO27001_CONSULTATION_URL',1),
('SVC-ISO-GAP','VER-ISO27001-2022-RTI-1','High','ISO 27001 Gap Assessment','ISO27001_CONSULTATION_URL',1),
('SVC-AWARE','VER-ISO27001-2022-RTI-1','C7-03','Information Security Awareness Training','ISO27001_CONSULTATION_URL',1),
('SVC-TECH','VER-ISO27001-2022-RTI-1','A8-THEME','Cybersecurity Technical Assessment','ISO27001_CONSULTATION_URL',1);

INSERT OR IGNORE INTO ai_provider_configuration
(id,provider_key,model_name,priority,is_enabled,updated_at)
VALUES
('AI-OPENAI','openai',NULL,10,0,CURRENT_TIMESTAMP),
('AI-GEMINI','gemini',NULL,20,0,CURRENT_TIMESTAMP),
('AI-CLAUDE','anthropic',NULL,30,0,CURRENT_TIMESTAMP),
('AI-GROQ','groq',NULL,40,0,CURRENT_TIMESTAMP),
('AI-OPENROUTER','openrouter',NULL,50,0,CURRENT_TIMESTAMP),
('AI-DEEPSEEK','deepseek',NULL,60,0,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO system_parameters
(group_key,value,label,description,sort_order,is_active,is_system,updated_at)
VALUES
('iso27001.scalar','CONTACT_WHATSAPP','+6285668722734','Business WhatsApp used by ISO/IEC 27001 readiness CTAs.',10,1,1,CURRENT_TIMESTAMP),
('iso27001.scalar','CONTACT_EMAIL','admin@risetin.co.id','Business email used by ISO/IEC 27001 readiness CTAs.',20,1,1,CURRENT_TIMESTAMP),
('iso27001.scalar','ISO27001_CONSULTATION_URL','/consultation','Consultation route used after the assessment.',30,1,1,CURRENT_TIMESTAMP),
('iso27001.scalar','QUICK_SCAN_DURATION','7–10 Mins','Duration label shown on the tool card.',40,1,1,CURRENT_TIMESTAMP),
('iso27001.scalar','DISCLAIMER','This is an RTI readiness indicator and not an official ISO certification score.','Readiness-score disclaimer.',50,1,1,CURRENT_TIMESTAMP);
