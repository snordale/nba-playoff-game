-- CreateTable
CREATE TABLE "playoff_series" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "conference" TEXT,
    "high_seed_team_id" TEXT NOT NULL,
    "low_seed_team_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "first_game_starts_at" TIMESTAMP(3),
    "winner_team_id" TEXT,
    "winner_wins" INTEGER,
    "loser_wins" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playoff_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_picks" (
    "id" TEXT NOT NULL,
    "group_user_id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "winner_team_id" TEXT NOT NULL,
    "games_count" INTEGER NOT NULL,
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_picks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "playoff_series_season_id_idx" ON "playoff_series"("season_id");

-- CreateIndex
CREATE UNIQUE INDEX "series_picks_group_user_id_series_id_key" ON "series_picks"("group_user_id", "series_id");

-- CreateIndex
CREATE INDEX "series_picks_group_user_id_idx" ON "series_picks"("group_user_id");

-- CreateIndex
CREATE INDEX "series_picks_series_id_idx" ON "series_picks"("series_id");

-- AddForeignKey
ALTER TABLE "playoff_series" ADD CONSTRAINT "playoff_series_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playoff_series" ADD CONSTRAINT "playoff_series_high_seed_team_id_fkey" FOREIGN KEY ("high_seed_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playoff_series" ADD CONSTRAINT "playoff_series_low_seed_team_id_fkey" FOREIGN KEY ("low_seed_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playoff_series" ADD CONSTRAINT "playoff_series_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_picks" ADD CONSTRAINT "series_picks_group_user_id_fkey" FOREIGN KEY ("group_user_id") REFERENCES "group_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_picks" ADD CONSTRAINT "series_picks_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "playoff_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
