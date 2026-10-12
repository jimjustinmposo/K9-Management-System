ALTER TABLE boarding_records ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE boarding_records ADD COLUMN price_per_day REAL NOT NULL DEFAULT 0;
ALTER TABLE boarding_records ADD COLUMN total_amount REAL;