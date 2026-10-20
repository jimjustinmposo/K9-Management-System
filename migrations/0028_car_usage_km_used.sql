ALTER TABLE k9_car_usage ADD COLUMN km_used REAL NOT NULL DEFAULT 0 CHECK (km_used >= 0);
UPDATE k9_car_usage SET km_used = km_end - km_start;