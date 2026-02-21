/*
  Warnings:

  - A unique constraint covering the columns `[group_user_id,player_id]` on the table `submissions` will be added. If there are existing duplicate values, this will fail.
  - Made the column `group_user_id` on table `submissions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey (IF EXISTS for idempotency)
ALTER TABLE "submissions" DROP CONSTRAINT IF EXISTS "submissions_group_user_id_fkey";

-- DropIndex (IF EXISTS for idempotency - index may have been renamed in prior migration)
DROP INDEX IF EXISTS "submissions_user_id_game_id_player_id_key";

-- AlterTable
ALTER TABLE "submissions" ALTER COLUMN "group_user_id" SET NOT NULL;

-- AlterTable (add column only if not exists)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- CreateIndex (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS "games_date_idx" ON "games"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "submissions_group_user_id_idx" ON "submissions"("group_user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "submissions_game_id_idx" ON "submissions"("game_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "submissions_user_id_idx" ON "submissions"("user_id");

-- CreateIndex (IF NOT EXISTS - may already exist from prior migration)
CREATE UNIQUE INDEX IF NOT EXISTS "submissions_group_user_id_player_id_key" ON "submissions"("group_user_id", "player_id");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_group_user_id_fkey" FOREIGN KEY ("group_user_id") REFERENCES "group_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
