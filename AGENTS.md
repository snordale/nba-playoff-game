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

**Environment (required):** `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `JWT_INVITE_SECRET`, `CRON_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAIL` (or `ADMIN_EMAILS` comma-separated). `CRON_SECRET` is required for cron routes (`load-games`, `sync-bracket`, `load-teams`, `load-blog-posts`). Admin routes require the authenticated user’s email to be in `ADMIN_EMAIL`/`ADMIN_EMAILS`. See `.env.example` for a full checklist. Set all in production.

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
- `GET /api/cron/sync-bracket` – Sync series outcomes and `firstGameStartsAt` from games, then advance bracket (create Semifinals → Conference Finals → Finals from winners). Scheduled 8am daily.
- `GET /api/cron/load-teams` – Load teams/rosters.
- `GET /api/cron/load-blog-posts` – Load blog.

**Admin (enforced by `lib/admin.ts` via `ADMIN_EMAIL`/`ADMIN_EMAILS`; middleware redirects unauthenticated users from `/admin`):**

- `GET /api/admin/me` – Returns 200 if current user is admin, 403 otherwise (used by admin page for client-side redirect).
- `GET/POST /api/admin/seasons` – List / create season.
- `POST /api/admin/auto-seed` – **Primary seeding action.** Body `{ year }`. Fetches ESPN standings, upserts 16 PlayoffSeed records (8 East, 8 West using ESPN `playoffSeed` field), then seeds the first-round bracket. Safe to re-run (seeds upserted, bracket skipped if series already exist). Requires teams to be in DB first (run load-teams). Returns 422 if fewer than 16 seeds are available (standings not finalized).
- `POST /api/admin/playoff-seeds` – Manual fallback: upsert a single seed (seasonId, teamId, seed, conference).
- `POST /api/admin/seed-bracket` – Body `{ year }` – create first-round PlayoffSeries from existing PlayoffSeeds.
- `POST /api/admin/sync-series-outcomes` – Body `{ year }` – set winnerTeamId/winnerWins/loserWins from completed games.
- `GET /api/admin/users`, `POST /api/admin/submission` – User list, upsert submission.
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
| React Query           | `react-query/queries.ts` |
| API client            | `services/ApiService/index.ts` |

**Data sources and pipelines:** See **DATA.md** for where data comes from (ESPN, admin, user, static), API endpoints, and how it flows into the DB.

---

## Scripts

- `npx tsx scripts/loadAllGames.ts [year]` – Load games for a season (uses Season from DB; default current).
- `npx tsx scripts/loadGames.ts` – Load games for a single date (legacy; cron uses DataLoaderService).
- `npx tsx scripts/loadTeamsAndPlayers.ts` – Sync teams and rosters from ESPN.
- `npx tsx scripts/seedPlayoffBracket.ts [year]` – Create first-round PlayoffSeries from PlayoffSeeds.
- `npx tsx scripts/syncSeriesOutcomes.ts [year]` – Sync outcomes and `firstGameStartsAt` from games, then advance bracket (auto-create Semifinals, Conference Finals, Finals from winners).

---

## Flows to Remember

1. **Season:** All playoff data is scoped by Season. Group API uses `?season=YYYY`; default is current season from `getCurrentSeason()`. Calendar and list use `season.startDate` / `season.endDate`.
2. **Pre-playoff:** When no season exists (e.g. before admin creates one), `GET /api/groups/[groupId]` still returns 200 with group, members, and `season: null`; the group page shows a pre-playoff message and invite link only. Creating and joining groups works regardless of season; picks become available once a season and bracket are configured.
3. **Daily pick:** User must be in group; pick must be for a scheduled game; that player not yet picked by that user; game not started. Submission is keyed by `(groupUserId, playerId)`.
4. **Series pick:** User must be in group; series not locked (`firstGameStartsAt`); winner is one of the two teams; gamesCount 4–7. Pick keyed by `(groupUserId, seriesId)`.
5. **Invite:** Link generated by `POST /api/groups/[groupId]/invites` (plural — the ApiService client must call `/invites`). Contains a JWT with `groupId`; expiry is 24h. Join endpoint validates token and rejects expired tokens with 400 "Invite link has expired". Unauthenticated user sees "Join Group" → sign-in with callback to `/invite?token=...`. Server decodes token, adds user to group, redirects to group. `POST /api/groups/[groupId]/join` with `{ token }` supports programmatic join.
6. **Season auto-creation:** `SeasonService.getOrCreateSeason(year)` is called by `DataLoaderService` for every game loaded. If no `Season` row for that year exists it auto-creates one with `startDate = April 1` (conservative stub) and `endDate` fetched live from ESPN (`fetchEspnSeasonEndDate` reads `leagues[0].season.endDate`; falls back to June 30). On the same cron run, if any loaded events have `event.season.type === 3` (ESPN postseason flag), `DataLoaderService` calls `updateSeasonStartIfEarlier(year, date)` to narrow `startDate` to the actual first postseason game date. **No hardcoded table, no admin action — self-corrects on first playoff game load.**
7. **Bracket setup (after regular season ends):** Season already exists (see above). Click **Auto-Seed** in the admin UI (enter the year) — this calls `POST /api/admin/auto-seed`, which fetches ESPN standings, upserts all 16 PlayoffSeed records, and creates the first-round bracket in one step. Re-runnable after play-in games to update seeds 7 & 8 (bracket creation is skipped if series already exist). After that everything is automated: load-games cron populates game data; sync-bracket cron sets `firstGameStartsAt`, derives outcomes, and advances the bracket through all rounds. **No manual data entry required.**

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
- **Admin:** Submission upsert (group, user, date, player); Season & Bracket section: create season, add playoff seeds, seed bracket, sync series outcomes. Admin identity enforced via `lib/admin.ts` (`ADMIN_EMAIL`/`ADMIN_EMAILS` env).

Use this file as the single source of truth for product behavior, data model, APIs, and scripts when implementing or refactoring features. Keep README.md, AGENTS.md, and DATA.md updated whenever you change or add anything they describe (see Documentation (markdown) and Conventions above).

