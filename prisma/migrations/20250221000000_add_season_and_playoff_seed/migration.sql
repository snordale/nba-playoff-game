-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playoff_seeds" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "conference" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playoff_seeds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seasons_year_key" ON "seasons"("year");

-- CreateIndex
CREATE UNIQUE INDEX "playoff_seeds_season_id_conference_seed_key" ON "playoff_seeds"("season_id", "conference", "seed");

-- Insert default 2025 season
INSERT INTO "seasons" ("id", "year", "start_date", "end_date", "display_name", "created_at", "updated_at")
VALUES (
    gen_random_uuid()::text,
    2025,
    '2025-04-19T00:00:00.000Z',
    '2025-06-23T23:59:59.000Z',
    '2024-25',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Add season_id to games (nullable first for backfill)
ALTER TABLE "games" ADD COLUMN "season_id" TEXT;

-- Backfill existing games with 2025 season
UPDATE "games" SET "season_id" = (SELECT "id" FROM "seasons" WHERE "year" = 2025 LIMIT 1);

-- Make season_id NOT NULL
ALTER TABLE "games" ALTER COLUMN "season_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playoff_seeds" ADD CONSTRAINT "playoff_seeds_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playoff_seeds" ADD CONSTRAINT "playoff_seeds_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "games_season_id_date_idx" ON "games"("season_id", "date");
