-- RTI ISO/IEC 27001 configurable gates, gap severity and roadmap rules.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS readiness_gates (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  gate_key TEXT NOT NULL,
  label TEXT NOT NULL,
  question_id TEXT NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  minimum_response INTEGER NOT NULL DEFAULT 3,
  evidence_required INTEGER NOT NULL DEFAULT 0 CHECK (evidence_required IN (0,1)),
  sort_order INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  UNIQUE(version_id, gate_key)
);

CREATE TABLE IF NOT EXISTS gap_severity_rules (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  criticality TEXT NOT NULL,
  maximum_response INTEGER NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Critical','High','Medium','Low')),
  sort_order INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);

CREATE TABLE IF NOT EXISTS roadmap_phase_rules (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  severity TEXT NOT NULL UNIQUE,
  phase TEXT NOT NULL,
  priority INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);

INSERT OR IGNORE INTO readiness_gates
(id,version_id,gate_key,label,question_id,minimum_response,evidence_required,sort_order,is_active)
VALUES
('GATE-01','VER-ISO27001-2022-RTI-1','scope_defined','Scope Defined','Q-C4-04',3,0,10,1),
('GATE-02','VER-ISO27001-2022-RTI-1','risk_assessment_available','Risk Assessment Available','Q-C6-02',3,1,20,1),
('GATE-03','VER-ISO27001-2022-RTI-1','risk_treatment_available','Risk Treatment Available','Q-C6-04',3,1,30,1),
('GATE-04','VER-ISO27001-2022-RTI-1','soa_available','Statement of Applicability Available','Q-C6-05',3,1,40,1),
('GATE-05','VER-ISO27001-2022-RTI-1','policies_available','ISMS Policies Available','Q-C5-02',3,1,50,1),
('GATE-06','VER-ISO27001-2022-RTI-1','controls_operating','Controls Operating','Q-C8-03',3,1,60,1),
('GATE-07','VER-ISO27001-2022-RTI-1','evidence_available','Evidence Available','Q-C7-05',3,1,70,1),
('GATE-08','VER-ISO27001-2022-RTI-1','internal_audit_completed','Internal Audit Completed','Q-C9-04',3,1,80,1),
('GATE-09','VER-ISO27001-2022-RTI-1','management_review_completed','Management Review Completed','Q-C9-05',3,1,90,1),
('GATE-10','VER-ISO27001-2022-RTI-1','corrective_actions_managed','Corrective Actions Managed','Q-C10-03',3,1,100,1);

INSERT OR IGNORE INTO gap_severity_rules
(id,version_id,criticality,maximum_response,severity,sort_order,is_active)
VALUES
('GSR-C-1','VER-ISO27001-2022-RTI-1','Critical',1,'Critical',10,1),
('GSR-C-2','VER-ISO27001-2022-RTI-1','Critical',2,'High',20,1),
('GSR-C-3','VER-ISO27001-2022-RTI-1','Critical',3,'Medium',30,1),
('GSR-H-1','VER-ISO27001-2022-RTI-1','High',1,'High',40,1),
('GSR-H-2','VER-ISO27001-2022-RTI-1','High',2,'High',50,1),
('GSR-H-3','VER-ISO27001-2022-RTI-1','High',3,'Medium',60,1),
('GSR-M-1','VER-ISO27001-2022-RTI-1','Medium',1,'Medium',70,1),
('GSR-M-2','VER-ISO27001-2022-RTI-1','Medium',2,'Medium',80,1),
('GSR-M-3','VER-ISO27001-2022-RTI-1','Medium',3,'Low',90,1),
('GSR-L-1','VER-ISO27001-2022-RTI-1','Low',2,'Low',100,1),
('GSR-L-2','VER-ISO27001-2022-RTI-1','Low',3,'Low',110,1);

INSERT OR IGNORE INTO roadmap_phase_rules
(id,version_id,severity,phase,priority,is_active)
VALUES
('RPR-C','VER-ISO27001-2022-RTI-1','Critical','30-Day Quick Wins',1,1),
('RPR-H','VER-ISO27001-2022-RTI-1','High','60-Day Remediation',2,1),
('RPR-M','VER-ISO27001-2022-RTI-1','Medium','90-Day Certification Preparation',3,1),
('RPR-L','VER-ISO27001-2022-RTI-1','Low','3–6 Month ISMS Improvement Roadmap',4,1);
