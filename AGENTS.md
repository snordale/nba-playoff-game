# NBA Playoff Game – Agent / Developer Guide

This document gives AI agents and developers the context needed to work on this codebase effectively.

---

## Documentation (markdown)

The repo uses three main markdown files; keep them comprehensive and in sync with the codebase.

| File | Purpose |
|------|---------|
| **README.md** | Human-facing: overview, getting started, env, scripts, project structure, requirements. Audience: new devs, deployers. |
| **AGENTS.md** | This file. Single source of truth for product behavior, data model, APIs, conventions, key files, scripts, flows. Audience: AI agents and developers implementing or refactoring features. |
| **DATA.md** | Data sources and pipelines: where data comes from (ESPN, admin, user, static), endpoints, how it flows into the DB, backwards compatibility. Audience: anyone changing data or integrations. |

**Keep docs current:** When you add or change features, APIs, data sources, scripts, environment variables, or product rules, update the relevant markdown file(s) so coverage stays comprehensive. For example: new API route → AGENTS.md (API Surface) and possibly README/DATA; new script → AGENTS.md (Scripts), README (Scripts), DATA.md if it moves data; new env var → README and AGENTS.md (Environment); schema or pipeline change → AGENTS.md (Data Model) and/or DATA.md.

---

## Product Overview

**NBA Playoff Game** is a group-based web app for the NBA playoffs. Users join **groups**, and within each group they play two games:

1. **Daily Picks (Game 1)**  
   Each playoff day, each user picks **one player** from any game that day. Once a player is picked, they cannot be picked again by that user for the rest of the playoffs. When the game finishes, the user gets a **fantasy score** from that player’s box stats (weighted: PTS 1, REB 1, AST 2, STL 2, BLK 2, TO -2). Leaderboard = sum of those scores.

2. **Series Bracket (Game 2)**  
   Before each series starts, users pick the **series winner** and **total games** (4–7). Points depend on round; correct games add a bonus; picking the **underdog** (lower seed) gives a 50% premium. Leaderboard = sum of series pick scores.

Both games live in the **same group** and are **season-scoped** (e.g. 2024–25 playoffs).

---

## Stack & Structure

- **Framework:** Next.js 15 (App Router)
- **UI:** React 18, Chakra UI, Tailwind, Framer Motion
- **Data:** Prisma, PostgreSQL
- **Auth:** NextAuth (e.g. Google)
- **Server:** Next.js API routes (Route Handlers in `app/api/`)
- **Client state:** TanStack Query; group-scoped state in `GroupContext`

**Conventions:**

- Use **functional components** only.
- Prefer **production-quality**, readable, efficient code.
- **Seasons** drive date ranges and filtering; avoid hardcoding playoff dates (use `SeasonService` / `Season` table).
- **Backwards compatibility:** Changes must support older data. Do not assume new fields exist, new enum values, or new relations; handle null/undefined and legacy shapes. Migrations should be additive or carefully backfilled so existing rows and older clients keep working.
- **Update markdown as you develop:** When you change or add behavior, APIs, data, scripts, or config, update the relevant doc (README.md, AGENTS.md, or DATA.md) in the same work so documentation stays comprehensive. See the Documentation (markdown) section above for which file to edit.

**Next.js server components & build-time DB access:**

- `DATABASE_URL` is only set in the **Production** Vercel environment. Preview and CI builds have no DB.
- **Never call Prisma directly in a server component's render body** unless the page is marked `export const dynamic = "force-dynamic"`. Static pages run at build time where there is no DB.
- **`generateStaticParams`** must always wrap its Prisma call in try/catch and return `[]` on failure so Preview builds don't break:
  ```ts
  export async function generateStaticParams() {
    try {
      const rows = await prisma.foo.findMany({ select: { slug: true } });
      return rows.map(r => ({ slug: r.slug }));
    } catch {
      return []; // no DB in Preview/CI — renders dynamically at request time
    }
  }
  ```
- **Pages that must query the DB at render time** (e.g. listing pages) should export `export const dynamic = "force-dynamic"` to opt out of static generation entirely.
- **Pre-deploy checklist:** Run `npm run typecheck && npm run lint` before pushing. The `postinstall` script runs `prisma generate`; `prebuild` runs `prisma migrate deploy` only when `DATABASE_URL` is set. CI enforces these on every PR.

**Prisma schema conventions:** Every camelCase scalar field must have `@map("snake_case")`; every model must have `@@map("snake_case_table")`. Relation fields (array or object, no DB column) do not get `@map`. See `.cursor/rules/prisma-schema.mdc`.

**Making schema changes — IMPORTANT:** `prisma migrate dev` is broken for local development because historical migrations cannot be cleanly replayed by the shadow database (a migration from 2025-02 alters the `games` table before it is created). **Never run `prisma migrate dev`**; follow this workflow instead:

1. Write the migration SQL manually (use `IF NOT EXISTS` / `IF EXISTS` for idempotency).
2. Create the file at `prisma/migrations/<timestamp>_<name>/migration.sql`.
3. Apply it directly to the local DB:
   ```bash
   npx prisma db execute --file prisma/migrations/<timestamp>_<name>/migration.sql --schema prisma/schema.prisma
   ```
4. Mark it as applied so Prisma knows not to re-run it:
   ```bash
   npx prisma migrate resolve --applied <timestamp>_<name>
   ```
5. Update `prisma/schema.prisma` to reflect the change.
6. Run `npx prisma generate` to regenerate the client.
7. Commit both the migration file and the updated schema together.

**Node:** Project requires Node.js **≥24.0.0** (`package.json` `engines`). CI uses 24; local dev can use `.nvmrc` (24) with nvm.

**Environment (required):** `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `JWT_INVITE_SECRET`, `CRON_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAIL` (or `ADMIN_EMAILS` comma-separated). `CRON_SECRET` is required for cron routes (`load-games`, `sync-bracket`, `load-teams`, `load-blog-posts`). Admin routes require the authenticated user’s email to be in `ADMIN_EMAIL`/`ADMIN_EMAILS`. See `.env.example` for a full checklist. Set all in production.

**package.json overrides:** `minimatch` — forces ≥10.2.1 for the whole tree (ReDoS fix; ESLint still pulls older minimatch). Remove when eslint upgrades. (No @types/react-dom override; explicit @types/react and @types/react-dom at 18.x resolve peer conflicts.)

---

## Data Model (Prisma)

**Core:**

- **User** – Auth (email, username, image); soft delete via `deletedAt`.
- **Group** – Named group (unique name).
- **GroupUser** – User ↔ Group membership; `isAdmin`.

**Season & games:**

- **Season** – `year`, `startDate`, `endDate`, `displayName` (e.g. "2024-25"). All playoff games and series belong to a season.
- **Game** – Single game; has `seasonId`, `date`, `startsAt`, `homeTeamId`, `awayTeamId`, scores, `status`, `statsProcessed`. Linked to Season.
- **Team** – NBA teams (global; `espnId`, name, abbreviation).
- **Player** – Players; `currentTeamId` (roster can change).
- **PlayerGameStats** – Per-game stats (points, rebounds, assists, steals, blocks, turnovers, minutes).
- **Submission** – One daily pick: `(groupUserId, playerId)`; implies one pick per player per user per playoff run. Linked to `gameId`.

**Bracket game:**

- **PlayoffSeed** – For a season: `(seasonId, conference, seed)` → `teamId` (EAST/WEST, seed 1–8).
- **PlayoffSeries** – One series: `seasonId`, `round` (FIRST_ROUND | SEMIFINALS | CONFERENCE_FINALS | FINALS), `conference`, `highSeedTeamId`, `lowSeedTeamId`, `sequence`, `firstGameStartsAt`, `winnerTeamId`, `winnerWins`, `loserWins`.
- **SeriesPick** – One pick per user per series: `(groupUserId, seriesId)` → `winnerTeamId`, `gamesCount` (4–7), `lockedAt`.

**Other:**

- **BlogPost** – Blog content (slug, title, excerpt, content).

Important constraints:

- `Submission`: `@@unique([groupUserId, playerId])`.
- `SeriesPick`: `@@unique([groupUserId, seriesId])`.

---

## Scoring Rules

**Daily game (ScoringService):**

- `SCORE_WEIGHTS`: points 1, rebounds 1, assists 2, steals 2, blocks 2, turnovers -2.
- Score = weighted sum of stats; `calculateScore(stats)` returns `null` if stats missing.

**Series game (SeriesScoringService):**

| Round              | Winner pts | Correct games bonus | Underdog premium |
|--------------------|------------|----------------------|-------------------|
| First Round        | 3          | 1.5                  | 50%               |
| Semifinals         | 4          | 2                    | 50%               |
| Conference Finals  | 6          | 3                    | 50%               |
| Finals             | 8          | 4                    | 50%               |

- Correct winner: base points. Correct total games: add bonus. If user picked **underdog** (low seed) and that team won: multiply total by 1.5.
- Underdog = `lowSeedTeamId`; favorite = `highSeedTeamId`.

---

## Locking & Validation

- **Daily picks:** A game is locked when `game.status !== "STATUS_SCHEDULED"` or `game.startsAt <= now`. Submissions only for scheduled games; one pick per player per user for the run.
- **Series picks:** Lock when `PlayoffSeries.firstGameStartsAt <= now`. Validate `gamesCount` in {4, 5, 6, 7}; `winnerTeamId` must be one of the two series teams.

---

## API Surface

**Auth:** `app/api/auth/[...nextauth]`

**Seasons:**

- `GET /api/seasons` – List seasons; `?current=true` for current season.
- `GET /api/seasons/[year]` – Season by year.
- `GET /api/seasons/[year]/series` – PlayoffSeries for that season.

**Groups:**

- `GET/POST /api/groups` – List / create.
- `GET /api/groups/[groupId]` – Group + leaderboard + gameCountsByDate + submissionsByDate + **season** (from query `?season=YYYY`) + **seriesLeaderboard** + **playoffSeries** + **seriesPicks**.
- `POST /api/groups/[groupId]/invites` – Generate invite link (JWT).
- `POST /api/groups/[groupId]/join` – Join with body `{ token }` (invite JWT).

**Games & players:**

- `GET /api/games?date=YYYY-MM-DD` – Games on date.
- `GET /api/players?date=YYYY-MM-DD` – Players in games that day.

**Picks:**

- `POST /api/submission` – Body `{ gameId, playerId, groupId }` – daily pick (scoped to group).
- `POST /api/series-pick` – Body `{ groupId, seriesId, winnerTeamId, gamesCount }` – series pick.

**Cron (Bearer CRON_SECRET):**

- `GET /api/cron/load-games?date=YYYY-MM-DD` – Load games for date (creates/finds Season from ESPN `season.year`). Scheduled 3am and 6am daily.
- `GET /api/cron/sync-bracket` – Sync series outcomes and `firstGameStartsAt` from games, then advance bracket in a loop until full bracket exists (SF → CF → Finals). Only games inside the season’s playoff window (`startDate`–`endDate`) are counted; games outside that window are unlinked from series so regular-season games (e.g. Oct, Nov, Jan, Feb) with the same team pair do not inflate series records. Idempotent. Scheduled 8am daily.
- `GET /api/cron/load-teams` – Load teams/rosters.
- `GET /api/cron/load-blog-posts` – Load blog.

**Admin (enforced by `lib/admin.ts` via `ADMIN_EMAIL`/`ADMIN_EMAILS`; middleware redirects unauthenticated users from `/admin`):**

- `GET /api/admin/me` – Returns 200 if current user is admin, 403 otherwise (used by admin page for client-side redirect).
- `GET/POST /api/admin/seasons` – List / create season.
- `POST /api/admin/auto-seed` – **Primary seeding action.** Body `{ year }`. Fetches ESPN standings, upserts 16 PlayoffSeed records (8 East, 8 West using ESPN `playoffSeed` field), then seeds the first-round bracket. Safe to re-run (seeds upserted, bracket skipped if series already exist). Requires teams to be in DB first (run load-teams). Returns 422 if fewer than 16 seeds are available (standings not finalized).
- `POST /api/admin/playoff-seeds` – Manual fallback: upsert a single seed (seasonId, teamId, seed, conference).
- `POST /api/admin/seed-bracket` – Body `{ year }` – create **first-round only** PlayoffSeries from existing PlayoffSeeds. Idempotent (skips if any series exist). Use sync-series-outcomes to complete the bracket.
- `POST /api/admin/sync-series-outcomes` – Body `{ year, advance?: boolean }` (default `advance: true`). Syncs winner/wins from completed games; when advance is true, runs advance in a loop until full bracket exists (SF → CF → Finals). Idempotent.
- `GET /api/admin/users`, `POST /api/admin/submission` – User list, upsert submission.
- `POST /api/admin/series-pick` – Body `{ groupId, userId, seriesId, winnerTeamId, gamesCount }`. Admin upsert of a user’s series pick; lock is not enforced. Validates user in group, series exists, winner is one of the series teams, gamesCount in [4, 5, 6, 7].
- `GET /api/teams` – List teams (for admin seeding).

**Blog:** `GET /api/blog/posts`, `GET /api/blog/posts/[slug]`

---

## Key Files

| Purpose              | Path |
|----------------------|------|
| Schema                | `prisma/schema.prisma` |
| Daily scoring         | `services/ScoringService/index.ts` |
| Series scoring        | `services/SeriesScoringService/index.ts` |
| Bracket sync/advance  | `services/BracketService/index.ts` |
| Season helpers        | `services/SeasonService/index.ts` |
| Game/roster loading   | `services/DataLoaderService/index.ts`, `services/EspnService/index.ts` |
| Submission helpers    | `utils/submission-utils.ts` |
| Group API (heavy)     | `app/api/groups/[groupId]/route.ts` |
| Group UI + context    | `components/pages/group/GroupInterface.tsx`, `GroupContext.tsx` |
| Bracket UI            | `components/pages/group/BracketView.tsx` |
| Season selector       | `components/pages/group/SeasonSelector.tsx` |
| Invite flow           | `app/invite/page.tsx`, `components/pages/invite/InviteClientPage.tsx` |
| Admin bracket/season  | `components/pages/admin/AdminSeasonBracket.tsx` |
| Admin series pick     | `components/pages/admin/AdminSeriesPick.tsx` |
| React Query           | `react-query/queries.ts` |
| API client            | `services/ApiService/index.ts` |

**Data sources and pipelines:** See **DATA.md** for where data comes from (ESPN, admin, user, static), API endpoints, and how it flows into the DB.

---

## Scripts

- `npx tsx scripts/loadAllGames.ts [year]` – Load games for a season (uses Season from DB; default current).
- `npx tsx scripts/loadGames.ts` – Load games for a single date (legacy; cron uses DataLoaderService).
- `npx tsx scripts/loadTeamsAndPlayers.ts` – Sync teams and rosters from ESPN.
- `npx tsx scripts/seedPlayoffBracket.ts [year]` – Create **first-round only** PlayoffSeries from PlayoffSeeds. Idempotent (skips if any series exist). Then run syncSeriesOutcomes to complete the bracket.
- `npx tsx scripts/syncSeriesOutcomes.ts [year]` – Sync outcomes and `firstGameStartsAt` from games, then advance bracket in a loop until full bracket exists. Idempotent.

---

## Flows to Remember

1. **Season:** All playoff data is scoped by Season. Group API uses `?season=YYYY`; default is current season from `getCurrentSeason()`. Calendar and list use `season.startDate` / `season.endDate`.
2. **Pre-playoff:** When no season exists (e.g. before admin creates one), `GET /api/groups/[groupId]` still returns 200 with group, members, and `season: null`; the group page shows a pre-playoff message and invite link only. Creating and joining groups works regardless of season; picks become available once a season and bracket are configured.
3. **Daily pick:** User must be in group; pick must be for a scheduled game; that player not yet picked by that user; game not started. Submission is keyed by `(groupUserId, playerId)`.
4. **Series pick:** User must be in group; series not locked (`firstGameStartsAt`); winner is one of the two teams; gamesCount 4–7. Pick keyed by `(groupUserId, seriesId)`.
5. **Invite:** Link generated by `POST /api/groups/[groupId]/invites` (plural — the ApiService client must call `/invites`). Contains a JWT with `groupId`; expiry is 24h. Join endpoint validates token and rejects expired tokens with 400 "Invite link has expired". Unauthenticated user sees "Join Group" → sign-in with callback to `/invite?token=...`. Server decodes token, adds user to group, redirects to group. `POST /api/groups/[groupId]/join` with `{ token }` supports programmatic join.
6. **Season auto-creation:** `SeasonService.getOrCreateSeason(year)` is called by `DataLoaderService` for every game loaded. If no `Season` row for that year exists it auto-creates one with `startDate = April 1` (conservative stub) and `endDate` fetched live from ESPN (`fetchEspnSeasonEndDate` reads `leagues[0].season.endDate`; falls back to June 30). On the same cron run, if any loaded events have `event.season.type === 3` (ESPN postseason flag), `DataLoaderService` calls `updateSeasonStartIfEarlier(year, date)` to narrow `startDate` to the actual first postseason game date. **No hardcoded table, no admin action — self-corrects on first playoff game load.**
7. **Bracket setup (after regular season ends):** Season already exists (see above). Click **Auto-Seed** in the admin UI (enter the year) — this calls `POST /api/admin/auto-seed`, which fetches ESPN standings, upserts all 16 PlayoffSeed records, and creates the **first-round only** bracket. Re-runnable after play-in games to update seeds 7 & 8 (bracket creation is skipped if series already exist). Run **Sync series outcomes** (or sync-bracket cron) to complete the bracket (SF → CF → Finals) in one idempotent run. After that: load-games cron populates game data; sync-bracket cron keeps outcomes and full bracket up to date. **No manual data entry required.**

---

## ESPN Usage

- **Scoreboard:** `getGamesByDate({ date })` – events include `season.year`, `competitions[0].type` (e.g. RD16), `notes` (e.g. "East 1st Round"), and `series` (wins, completed). DataLoader uses `season.year` to get/create Season and attach `seasonId` to games.
- **Box score:** `getEventBoxScore({ eventId })` – for stats.
- **Teams/rosters:** `getAllTeams()`, `getTeamRoster(abbrev)` – for loading teams and players.

No public ESPN bracket API; bracket (PlayoffSeries) is built from PlayoffSeeds (admin or script).

---

## UI Conventions

- **Group page layout:** Header row (group name + season selector | invite button) → primary game-mode tabs ("Daily Picks" / "Bracket") → tab content.
  - **Daily Picks tab:** Leaderboard table → optional empty-state banner (if no games loaded yet) → secondary view-mode toggle (List / Calendar) → day cards or calendar.
  - **Bracket tab:** Series leaderboard table → series pick grid (one card per PlayoffSeries).
- **Pre-playoff state:** When `season === null`, show group name, invite button, pre-playoff message, and member list only.
- **SeriesCard:** Round badge + conference badge + lock time (or "Locked" badge). Matchup: Underdog (low seed, left) vs Favorite (high seed, right). Favorite is bold + orange for Finals only. Completed series shows a green result callout. Locked pick shown in a styled gray box; missing pick shown in red.
- **DailySubmissionCard:** "Open" (orange solid badge) / "Final" (gray subtle badge) status indicator.
- **Leaderboard component** (`components/pages/group/Leaderboard.tsx`): accepts optional `users`, `title`, and `emptyText` props; defaults to daily-picks context data. Used in both Daily tab and Bracket tab (series leaderboard).
- **Bracket display:** Favorite (high seed) labeled "Favorite" on right for all rounds; **Bold + orange** for Finals only (UI).
- **Admin:** Submission upsert (group, user, date, player); **Upsert Series Pick** (year, round, series list, group, user, winner, games 4–7); Season & Bracket section: create season, add playoff seeds, seed bracket, sync series outcomes. Admin identity enforced via `lib/admin.ts` (`ADMIN_EMAIL`/`ADMIN_EMAILS` env).

Use this file as the single source of truth for product behavior, data model, APIs, and scripts when implementing or refactoring features. Keep README.md, AGENTS.md, and DATA.md updated whenever you change or add anything they describe (see Documentation (markdown) and Conventions above).

