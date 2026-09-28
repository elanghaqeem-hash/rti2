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

INSERT OR IGNORE INTO estimator_settings (key,label,value,is_public,updated_at) VALUES
  ('policy_simulation_sample_size','Policy simulation sample size','20',0,CURRENT_TIMESTAMP),
  ('policy_publish_requires_calibrated_rates','Block policy publish until active internal day rates are calibrated','true',0,CURRENT_TIMESTAMP),
  ('policy_publish_confirmation_phrase','Policy publish confirmation phrase','PUBLISH RTI POLICY',0,CURRENT_TIMESTAMP);
