CREATE TABLE IF NOT EXISTS k9_medications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  description TEXT NOT NULL DEFAULT '',
  dosage_guideline TEXT NOT NULL DEFAULT '',
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_k9_medications_workspace_name ON k9_medications(workspace_id, name);

CREATE TABLE IF NOT EXISTS k9_medical_records (
  id TEXT PRIMARY KEY,
  k9_id TEXT NOT NULL REFERENCES k9_roster(id) ON DELETE CASCADE,
  medication_id TEXT NOT NULL REFERENCES k9_medications(id) ON DELETE RESTRICT,
  dosage_given TEXT NOT NULL,
  administration_method TEXT NOT NULL,
  frequency TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL DEFAULT '',
  administered_by TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_k9_medical_records_workspace_k9 ON k9_medical_records(workspace_id, k9_id);
CREATE INDEX IF NOT EXISTS idx_k9_medical_records_workspace_medication ON k9_medical_records(workspace_id, medication_id);
CREATE INDEX IF NOT EXISTS idx_k9_medical_records_start_date ON k9_medical_records(workspace_id, start_date);

CREATE TABLE IF NOT EXISTS k9_medical_conditions (
  id TEXT PRIMARY KEY,
  k9_id TEXT NOT NULL REFERENCES k9_roster(id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL,
  diagnosis_date TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Low', 'Moderate', 'High', 'Critical')),
  notes TEXT NOT NULL DEFAULT '',
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_k9_medical_conditions_workspace_k9 ON k9_medical_conditions(workspace_id, k9_id);
CREATE INDEX IF NOT EXISTS idx_k9_medical_conditions_severity ON k9_medical_conditions(workspace_id, severity);