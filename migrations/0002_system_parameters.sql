-- RTI centralized parameter registry
-- Apply after migrations/0001_leads.sql to the D1 database bound as RTI_DB.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS system_parameters (
  group_key TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (group_key, value)
);

CREATE INDEX IF NOT EXISTS idx_system_parameters_group_order
  ON system_parameters(group_key, sort_order, label);

CREATE INDEX IF NOT EXISTS idx_system_parameters_active
  ON system_parameters(group_key, is_active);
