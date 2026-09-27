-- Persist additional deterministic ISO readiness dimensions for reporting.
PRAGMA foreign_keys = ON;

ALTER TABLE assessments ADD COLUMN requirement_score REAL;
ALTER TABLE assessments ADD COLUMN control_score REAL;
ALTER TABLE assessments ADD COLUMN stage1_score REAL;
ALTER TABLE assessments ADD COLUMN stage2_score REAL;
