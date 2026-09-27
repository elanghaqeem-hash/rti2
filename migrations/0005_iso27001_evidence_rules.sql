-- Configurable evidence maturity rules for ISO/IEC 27001 readiness.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS evidence_status_rules (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  status_key TEXT NOT NULL,
  label TEXT NOT NULL,
  score_percent REAL NOT NULL CHECK (score_percent >= 0 AND score_percent <= 100),
  sort_order INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  UNIQUE(version_id, status_key)
);

INSERT OR IGNORE INTO evidence_status_rules
(id,version_id,status_key,label,score_percent,sort_order,is_active)
VALUES
('EV-NONE','VER-ISO27001-2022-RTI-1','no_evidence','No Evidence',0,10,1),
('EV-PLAN','VER-ISO27001-2022-RTI-1','evidence_planned','Evidence Planned',20,20,1),
('EV-EXISTS','VER-ISO27001-2022-RTI-1','evidence_exists','Evidence Exists',45,30,1),
('EV-UPLOADED','VER-ISO27001-2022-RTI-1','evidence_uploaded','Evidence Uploaded',65,40,1),
('EV-REVIEWED','VER-ISO27001-2022-RTI-1','evidence_reviewed','Evidence Reviewed',100,50,1),
('EV-IMPROVE','VER-ISO27001-2022-RTI-1','evidence_needs_improvement','Evidence Needs Improvement',50,60,1);
