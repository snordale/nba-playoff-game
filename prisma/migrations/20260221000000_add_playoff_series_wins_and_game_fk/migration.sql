-- Add live win counters to playoff_series (default 0, always up to date)
ALTER TABLE "playoff_series"
  ADD COLUMN IF NOT EXISTS "high_seed_wins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "low_seed_wins"  INTEGER NOT NULL DEFAULT 0;

-- Add nullable FK from games to playoff_series
ALTER TABLE "games"
  ADD COLUMN IF NOT EXISTS "playoff_series_id" TEXT;

-- Index for efficient series→game lookups
CREATE INDEX IF NOT EXISTS "games_playoff_series_id_idx" ON "games"("playoff_series_id");

-- FK constraint (no cascade — series deletion is rare and explicit)
ALTER TABLE "games"
  DROP CONSTRAINT IF EXISTS "games_playoff_series_id_fkey";
ALTER TABLE "games"
  ADD CONSTRAINT "games_playoff_series_id_fkey"
  FOREIGN KEY ("playoff_series_id") REFERENCES "playoff_series"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
