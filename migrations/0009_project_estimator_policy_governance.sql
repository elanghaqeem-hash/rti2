-- RTI Project Estimator & RFQ Builder v6
-- Policy governance and simulation history.
-- No policy is auto-published by this migration.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS estimator_policy_simulations (
  id TEXT PRIMARY KEY,
  policy_version_id TEXT,
  candidate_json TEXT NOT NULL,
  sample_size INTEGER NOT NULL DEFAULT 0,
  included_count INTEGER NOT NULL DEFAULT 0,
  excluded_count INTEGER NOT NULL DEFAULT 0,
  result_json TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (policy_version_id) REFERENCES estimator_policy_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_estimator_policy_simulations_created
  ON estimator_policy_simulations(created_at DESC);

CREATE TABLE IF NOT EXISTS estimator_policy_publish_checks (
  id TEXT PRIMARY KEY,
  policy_version_id TEXT NOT NULL,
  check_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass','warn','block')),
  message TEXT NOT NULL,
  detail_json TEXT,
  checked_by TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  FOREIGN KEY (policy_version_id) REFERENCES estimator_policy_versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_estimator_policy_publish_checks
  ON estimator_policy_publish_checks(policy_version_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS estimator_go_live_decisions (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed')),
  decision_json TEXT,
  decided_by TEXT,
  decided_at TEXT,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO estimator_go_live_decisions
  (code,title,status,updated_at)
VALUES
  ('K-1','Rate card & margin RTI','pending',CURRENT_TIMESTAMP),
  ('K-2','Identitas visual Risetin','pending',CURRENT_TIMESTAMP),
  ('K-3','Penomoran RFQ dan quotation','pending',CURRENT_TIMESTAMP),
  ('K-4','Tampilan harga pada widget publik','pending',CURRENT_TIMESTAMP),
  ('K-5','Katalog layanan final untuk go-live','pending',CURRENT_TIMESTAMP),
  ('K-6','Kebijakan garansi SWDEV dan retest VAPT','pending',CURRENT_TIMESTAMP),
  ('K-7','Hosting / production architecture','pending',CURRENT_TIMESTAMP),
  ('K-8','Skema mitra training / revenue sharing','pending',CURRENT_TIMESTAMP);


INSERT OR IGNORE INTO estimator_settings (key,label,value,is_public,updated_at) VALUES
  ('policy_simulation_sample_size','Policy simulation sample size','20',0,CURRENT_TIMESTAMP),
  ('policy_publish_requires_calibrated_rates','Block policy publish until active internal day rates are calibrated','true',0,CURRENT_TIMESTAMP),
  ('policy_publish_confirmation_phrase','Policy publish confirmation phrase','PUBLISH RTI POLICY',0,CURRENT_TIMESTAMP);
