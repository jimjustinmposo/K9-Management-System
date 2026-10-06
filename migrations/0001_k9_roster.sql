CREATE TABLE IF NOT EXISTS k9_roster (
  id TEXT PRIMARY KEY,
  profile_photo TEXT NOT NULL DEFAULT '',
  dog_name TEXT NOT NULL,
  nick_name TEXT NOT NULL DEFAULT '',
  breed TEXT NOT NULL DEFAULT '',
  date_of_birth TEXT NOT NULL DEFAULT '',
  sex TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  microchip_number TEXT NOT NULL DEFAULT '',
  father_sire TEXT NOT NULL DEFAULT '',
  mother_dam TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_k9_roster_dog_name ON k9_roster(dog_name);
CREATE INDEX IF NOT EXISTS idx_k9_roster_status ON k9_roster(status);
CREATE INDEX IF NOT EXISTS idx_k9_roster_microchip ON k9_roster(microchip_number);
