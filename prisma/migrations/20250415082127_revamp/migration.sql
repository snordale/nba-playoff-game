/*
  Warnings:

  - You are about to drop the column `createdAt` on the `players` table. All the data in the column will be lost.
  - You are about to drop the column `is_admin` on the `players` table. All the data in the column will be lost.
  - You are about to drop the column `leagueId` on the `players` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `players` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `players` table. All the data in the column will be lost.
  - You are about to drop the column `assists` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `blocks` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `playerId` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `playerImage` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `playerName` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `points` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `rebounds` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `steals` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `teamName` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `turnovers` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `leagues` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[espnId]` on the table `players` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,game_id,player_id]` on the table `submissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `players` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `players` table without a default value. This is not possible if the table is not empty.
  - Added the required column `game_id` to the `submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `player_id` to the `submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "players" DROP CONSTRAINT "players_leagueId_fkey";

-- DropForeignKey
ALTER TABLE "players" DROP CONSTRAINT "players_userId_fkey";

-- DropForeignKey
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_playerId_fkey";

-- AlterTable
ALTER TABLE "players" DROP COLUMN "createdAt",
DROP COLUMN "is_admin",
DROP COLUMN "leagueId",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "current_team_id" TEXT,
ADD COLUMN     "espnId" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "submissions" DROP COLUMN "assists",
DROP COLUMN "blocks",
DROP COLUMN "createdAt",
DROP COLUMN "date",
DROP COLUMN "playerId",
DROP COLUMN "playerImage",
DROP COLUMN "playerName",
DROP COLUMN "points",
DROP COLUMN "rebounds",
DROP COLUMN "steals",
DROP COLUMN "teamName",
DROP COLUMN "turnovers",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "game_id" TEXT NOT NULL,
ADD COLUMN     "group_user_id" TEXT,
ADD COLUMN     "player_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "leagues";

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_users" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "is_admin" BOOLEAN,

    CONSTRAINT "group_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "espnId" TEXT,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "espnId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "home_team_id" TEXT NOT NULL,
    "away_team_id" TEXT NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "status" TEXT NOT NULL,
    "stats_processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_game_stats" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "minutes" TEXT,
    "points" INTEGER,
    "rebounds" INTEGER,
    "assists" INTEGER,
    "steals" INTEGER,
    "blocks" INTEGER,
    "turnovers" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_game_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_espnId_key" ON "teams"("espnId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_abbreviation_key" ON "teams"("abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "games_espnId_key" ON "games"("espnId");

-- CreateIndex
CREATE UNIQUE INDEX "player_game_stats_game_id_player_id_key" ON "player_game_stats"("game_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "players_espnId_key" ON "players"("espnId");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_user_id_game_id_player_id_key" ON "submissions"("user_id", "game_id", "player_id");

-- AddForeignKey
ALTER TABLE "group_users" ADD CONSTRAINT "group_users_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_users" ADD CONSTRAINT "group_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_current_team_id_fkey" FOREIGN KEY ("current_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_game_stats" ADD CONSTRAINT "player_game_stats_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_game_stats" ADD CONSTRAINT "player_game_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_group_user_id_fkey" FOREIGN KEY ("group_user_id") REFERENCES "group_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
