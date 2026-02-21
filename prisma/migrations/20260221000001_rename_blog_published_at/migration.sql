-- Rename camelCase column to snake_case to match @map("published_at") in schema.
-- Safe rename: no data loss, no constraint changes needed.
ALTER TABLE "blog_posts" RENAME COLUMN "publishedAt" TO "published_at";
