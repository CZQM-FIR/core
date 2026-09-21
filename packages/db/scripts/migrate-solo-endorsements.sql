-- One-shot migration: move solo_endorsements.position_id into join table.
-- Run BEFORE drizzle-kit push when upgrading an existing database that still
-- has position_id on solo_endorsements.
--
-- Example (local file DB):
--   sqlite3 local.db < packages/db/scripts/migrate-solo-endorsements.sql
--
-- Then push remaining schema (presets tables if missing; confirms shape):
--   TURSO_URL=... TURSO_TOKEN=... pnpm --filter @czqm/db exec drizzle-kit push
--
-- Fresh DBs can skip this script and only run drizzle-kit push.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS solo_endorsement_positions (
  endorsement_id INTEGER NOT NULL,
  position_id INTEGER NOT NULL,
  PRIMARY KEY (endorsement_id, position_id)
);

INSERT OR IGNORE INTO solo_endorsement_positions (endorsement_id, position_id)
SELECT id, position_id
FROM solo_endorsements
WHERE position_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS solo_endorsement_positions_endorsement_idx
  ON solo_endorsement_positions (endorsement_id);
CREATE INDEX IF NOT EXISTS solo_endorsement_positions_position_idx
  ON solo_endorsement_positions (position_id);

CREATE TABLE IF NOT EXISTS solo_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  name TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS solo_presets_level_idx ON solo_presets (level);

CREATE TABLE IF NOT EXISTS solo_preset_positions (
  preset_id INTEGER NOT NULL,
  position_id INTEGER NOT NULL,
  PRIMARY KEY (preset_id, position_id)
);
CREATE INDEX IF NOT EXISTS solo_preset_positions_preset_idx
  ON solo_preset_positions (preset_id);
CREATE INDEX IF NOT EXISTS solo_preset_positions_position_idx
  ON solo_preset_positions (position_id);

CREATE TABLE solo_endorsements_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  controller_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

INSERT INTO solo_endorsements_new (id, controller_id, expires_at)
SELECT id, controller_id, expires_at FROM solo_endorsements;

DROP TABLE solo_endorsements;
ALTER TABLE solo_endorsements_new RENAME TO solo_endorsements;

CREATE INDEX IF NOT EXISTS controller_id_idx ON solo_endorsements (controller_id);

PRAGMA foreign_keys = ON;
