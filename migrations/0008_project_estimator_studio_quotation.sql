-- RTI Project Estimator & RFQ Builder v5
-- Internal Studio, quotation approval, client portal and estimate-actual tracking.
-- Commercial thresholds are seed calibration values and require RTI management approval before go-live.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS estimator_quotations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  estimate_id TEXT NOT NULL,
  rfq_id TEXT,
  doc_number TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  segment_code TEXT NOT NULL DEFAULT 'STD',
  price_option TEXT NOT NULL CHECK (price_option IN ('floor','standard','premium','custom')),
  internal_cost INTEGER NOT NULL DEFAULT 0,
  floor_price INTEGER NOT NULL DEFAULT 0,
  standard_price INTEGER NOT NULL DEFAULT 0,
  premium_price INTEGER NOT NULL DEFAULT 0,
  final_price INTEGER NOT NULL DEFAULT 0,
  discount_pct REAL NOT NULL DEFAULT 0,
  payment_terms_json TEXT NOT NULL DEFAULT '{}',
  valid_until TEXT NOT NULL,
  approval_level_required TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_approval','approved','sent','accepted','rejected','expired')),
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES estimator_sessions(id),
  FOREIGN KEY (estimate_id) REFERENCES project_estimates(id),
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id)
);

CREATE INDEX IF NOT EXISTS idx_estimator_quotations_session
  ON estimator_quotations(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimator_quotations_status
  ON estimator_quotations(status, valid_until);

CREATE TABLE IF NOT EXISTS estimator_quotation_approvals (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  level TEXT NOT NULL,
  approver_role TEXT NOT NULL,
  actor TEXT,
  decision TEXT CHECK (decision IN ('pending','approved','rejected')),
  note TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (quotation_id) REFERENCES estimator_quotations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_estimator_quote_approvals
  ON estimator_quotation_approvals(quotation_id, created_at);

CREATE TABLE IF NOT EXISTS estimator_approval_rules_v2 (
  id TEXT PRIMARY KEY,
  rule_name TEXT NOT NULL,
  condition_json TEXT NOT NULL,
  approval_level TEXT NOT NULL,
  approver_role TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  needs_calibration INTEGER NOT NULL DEFAULT 1 CHECK (needs_calibration IN (0,1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS estimator_actuals (
  estimate_id TEXT PRIMARY KEY,
  actual_md REAL,
  actual_cost INTEGER,
  completed_at TEXT,
  note TEXT,
  updated_by TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (estimate_id) REFERENCES project_estimates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estimator_client_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client','rti')),
  sender_name TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES estimator_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_estimator_client_messages
  ON estimator_client_messages(session_id, created_at);

INSERT OR IGNORE INTO estimator_approval_rules_v2
  (id,rule_name,condition_json,approval_level,approver_role,sort_order,needs_calibration,is_active,updated_at)
VALUES
  ('approval-sales-head','Standard delegated approval','{"maxDiscountPct":10,"maxValue":250000000,"requiresAtOrAboveFloor":true}','sales_head','sales_head',10,1,1,CURRENT_TIMESTAMP),
  ('approval-management','Management approval','{"maxDiscountPct":15,"maxValue":1000000000,"requiresAtOrAboveFloor":true}','management','management',20,1,1,CURRENT_TIMESTAMP),
  ('approval-director','Director exception approval','{"priceBelowFloor":true,"segmentOverride":true,"fallback":true}','director','management',30,1,1,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO estimator_settings (key,label,value,is_public,updated_at) VALUES
  ('quotation_prefix','Quotation number prefix','RTI-QUO',0,CURRENT_TIMESTAMP),
  ('quotation_valid_days','Quotation validity (days)','14',0,CURRENT_TIMESTAMP),
  ('payment_terms_swdev','Default SWDEV payment terms','{"milestones":[30,40,30],"topDays":14}',0,CURRENT_TIMESTAMP),
  ('payment_terms_vapt_governance','Default VAPT/Governance payment terms','{"milestones":[30,50,20],"topDays":14}',0,CURRENT_TIMESTAMP),
  ('payment_terms_training','Default Training payment terms','{"upfrontPct":100,"topDays":14}',0,CURRENT_TIMESTAMP),
  ('approval_calibration_status','Approval matrix calibration status','KALIBRASI RTI',0,CURRENT_TIMESTAMP);
