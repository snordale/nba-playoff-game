/*
  Warnings:

  - A unique constraint covering the columns `[group_user_id,player_id]` on the table `submissions` will be added. If there are existing duplicate values, this will fail.
  - Made the column `group_user_id` on table `submissions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_group_user_id_fkey";

-- DropIndex
DROP INDEX "submissions_user_id_game_id_player_id_key";

-- AlterTable
ALTER TABLE "submissions" ALTER COLUMN "group_user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "games_date_idx" ON "games"("date");

-- CreateIndex
CREATE INDEX "submissions_group_user_id_idx" ON "submissions"("group_user_id");

-- CreateIndex
CREATE INDEX "submissions_game_id_idx" ON "submissions"("game_id");

-- CreateIndex
CREATE INDEX "submissions_user_id_idx" ON "submissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_group_user_id_player_id_key" ON "submissions"("group_user_id", "player_id");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_group_user_id_fkey" FOREIGN KEY ("group_user_id") REFERENCES "group_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
