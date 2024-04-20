/*
  Warnings:

  - You are about to drop the column `groupId` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `playerImageUrl` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `groups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_groups` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `playerImage` to the `submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamName` to the `submissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "submissions" DROP COLUMN "groupId",
DROP COLUMN "playerImageUrl",
DROP COLUMN "userId",
ADD COLUMN     "assists" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "blocks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "playerImage" TEXT NOT NULL,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rebounds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "steals" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "teamName" TEXT NOT NULL,
ADD COLUMN     "turnovers" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password";

-- DropTable
DROP TABLE "groups";

-- DropTable
DROP TABLE "user_groups";

-- CreateTable
CREATE TABLE "leagues" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "is_admin" TIMESTAMP(3),

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leagues_name_key" ON "leagues"("name");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
