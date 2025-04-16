/*
  Warnings:

  - You are about to drop the column `awayScore` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `homeScore` on the `games` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "games" DROP COLUMN "awayScore",
DROP COLUMN "homeScore",
ADD COLUMN     "away_score" INTEGER,
ADD COLUMN     "home_score" INTEGER,
ADD COLUMN     "starts_at" TIMESTAMP(3);
