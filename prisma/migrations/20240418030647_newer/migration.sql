/*
  Warnings:

  - You are about to drop the column `content` on the `submissions` table. All the data in the column will be lost.
  - Added the required column `playerId` to the `submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `playerImageUrl` to the `submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `playerName` to the `submissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "submissions" DROP COLUMN "content",
ADD COLUMN     "playerId" TEXT NOT NULL,
ADD COLUMN     "playerImageUrl" TEXT NOT NULL,
ADD COLUMN     "playerName" TEXT NOT NULL;
