-- Reset the old training module without affecting the K9 roster.
-- Drop child tables before the tables they reference.
DROP TABLE IF EXISTS training_assessments;
DROP TABLE IF EXISTS training_goals;
DROP TABLE IF EXISTS training_sessions;
DROP TABLE IF EXISTS assessment_criteria;
DROP TABLE IF EXISTS training_types;
