# Data & Data Sources

This document describes where data comes from, how it flows into the app, and how it is stored. Use it when debugging data issues, adding integrations, or changing pipelines. When you add or change data sources, pipelines, or schema, update this file and any affected sections in **AGENTS.md** or **README.md** so documentation stays comprehensive (see AGENTS.md → Documentation).

---

## Overview

| Data | Primary source | How it gets into the app | Stored in (DB) |
|------|----------------|--------------------------|----------------|
| **Games** (schedule, scores, status) | ESPN API | Cron or script → DataLoaderService | `Game` |
| **Teams** | ESPN API | Cron or script → DataLoaderService | `Team` |
| **Players** (rosters) | ESPN API | Cron or script → DataLoaderService | `Player` |
| **Player stats** (per game) | ESPN API (box score) | Load-games flow → DataLoaderService | `PlayerGameStats` |
| **Seasons** (playoff date range) | ESPN `season.year` + `season.endDate` (auto) or Admin override | `getOrCreateSeason(year)` in DataLoaderService creates season automatically on first game load; start is computed (Apr 15), end is fetched live from ESPN; admin UI can also create/override | `Season` |
| **Playoff seeds** (conference + seed → team) | ESPN standings (auto via Auto-Seed) or Admin manual fallback | `POST /api/admin/auto-seed` fetches ESPN `playoffSeed` field; manual `POST /api/admin/playoff-seeds` as fallback | `PlayoffSeed` |
| **Playoff series** (matchups, rounds) | Derived + Admin | Seed script (first round); BracketService (later rounds from winners) | `PlayoffSeries` |
| **Series outcomes** (winner, wins) | Derived from games | BracketService sync from final games | `PlayoffSeries` (highSeedWins, lowSeedWins always live; winnerTeamId/winnerWins/loserWins on completion) |
| **Series first-game time** | Derived from games | BracketService from earliest matching game per series | `PlayoffSeries.firstGameStartsAt` |
| **User picks (daily)** | User input | Group member submits via UI/API | `Submission` |
| **User picks (series)** | User input | Group member submits via UI/API | `SeriesPick` |
| **Blog content** | In-repo static | Cron reads `app/blog/posts.ts` → upserts | `BlogPost` |
| **Groups, invites, auth** | User input / NextAuth | UI and API | `Group`, `GroupUser`, `User`, etc. |

---

## ESPN API

The app uses ESPN’s public site APIs for NBA data. No API key is required. All calls are made from the server (DataLoaderService, via cron or scripts).

### Endpoints used

| Purpose | URL pattern | Used by | Returns |
|--------|-------------|---------|--------|
| **Scoreboard (games by date)** | `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=YYYYMMDD` | `getGamesByDate` | List of events: id, date, status, competitors (home/away, team, score), season.year |
| **Game summary (box score)** | `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={eventId}` | `getEventBoxScore` | Box score with `boxscore.players`: per-team athletes and stats arrays |
| **All teams** | `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams` | `getAllTeams` | Teams list (id, displayName, abbreviation, logos) |
| **Team roster** | `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{abbrev}/roster` | `getTeamRoster` | Roster athletes (id, fullName, headshot, etc.); abbrev is lowercase in URL |

### Important details

- **Game ID:** Event `id` from the scoreboard is stored as `Game.espnId` and used as the unique key for upserts.
- **Date format for scoreboard:** `YYYYMMDD` (e.g. `20250419`). See `formatDateForEspn` in EspnService.
- **Game status:** Stored as `event.status.type.name` (e.g. `STATUS_SCHEDULED`, `STATUS_FINAL`). BracketService uses `STATUS_FINAL` plus non-null scores to compute series outcomes.
- **Season from ESPN:** When loading games, we use `event.season?.year` (or the event date’s year) to get or create a `Season` and set `Game.seasonId`.
- **Box score:** Fetched only when game is not in “pre” state. Stats array order matches `STAT_INDICES` in EspnService (minutes, points, rebounds, assists, steals, blocks, turnovers). Used to populate `PlayerGameStats`.
- **Timezones:** Game dates are normalized to America/New_York for `Game.date`; `Game.startsAt` comes from the event date (or null if TBD).

### What ESPN does *not* provide

- Playoff bracket or series matchups. Those are built from **PlayoffSeeds** (admin) and **BracketService** (advance from winners).
- Historical bracket results; we derive them from completed games.

---

## Database (PostgreSQL + Prisma)

- **Schema:** `prisma/schema.prisma`. Migrations in `prisma/migrations/`.
- **Canonical IDs:** Games keyed by `espnId`; teams by `espnId` or name; players by `espnId`. User/group data uses UUIDs.
- **Backwards compatibility:** When changing schema or pipelines, support existing rows and older data shapes (nullable new fields, default values, or migration backfills). See AGENTS.md Conventions.

### Data ownership (who writes what)

- **ESPN-sourced:** `Game`, `Team`, `Player`, `PlayerGameStats` — written by DataLoaderService (load-games, load-teams).
- **Auto-created:** `Season` — created by `getOrCreateSeason(year)` in DataLoaderService on first game load for that year (no admin action needed). Start date begins as April 1 (stub) and is automatically narrowed to the real first postseason game date via `updateSeasonStartIfEarlier` when DataLoaderService encounters an event with `season.type === 3`. End date is fetched live from ESPN (`fetchEspnSeasonEndDate`). No hardcoded table, works for any year.
- **Admin / script:** `PlayoffSeed` (admin, after regular season ends); first-round `PlayoffSeries` (seed-bracket admin UI or script).
- **Derived from DB + games:** `PlayoffSeries.highSeedWins`, `lowSeedWins` (always live), `winnerTeamId`, `winnerWins`, `loserWins`, `firstGameStartsAt`; later-round `PlayoffSeries` rows (BracketService). `Game.playoffSeriesId` FK set by DataLoaderService for postseason games.
- **User/app:** `User`, `Group`, `GroupUser`, `Submission`, `SeriesPick`; invite JWTs use `JWT_INVITE_SECRET`.
- **Blog:** `BlogPost` — written by load-blog-posts cron from static content.

---

## Bracket data flow

1. **Seasons:** Auto-created by `getOrCreateSeason(year)` in DataLoaderService when the first game for that year is loaded. Start date is initially April 1 (stub) and self-corrects to the actual first postseason game date via `updateSeasonStartIfEarlier` on the first cron run that loads postseason events (`event.season.type === 3`). End date is fetched live from ESPN. No hardcoded table, no manual step. Admin UI can also create or override if needed.
2. **Playoff seeds:** Auto-seeded via `POST /api/admin/auto-seed` (Admin UI "Auto-Seed" button). Fetches ESPN standings, reads the `playoffSeed` stat field (1–8) for each conference, and upserts 16 `PlayoffSeed` rows. Safe to re-run after play-in games. Manual fallback: `POST /api/admin/playoff-seeds` (one seed at a time).
3. **First-round series:** Script `seedPlayoffBracket.ts` creates `PlayoffSeries` with `round: FIRST_ROUND` from seeds (matchups 1v8, 2v7, 3v6, 4v5 per conference).
4. **Games:** Loaded by cron/script; each game has `seasonId`, `homeTeamId`, `awayTeamId`, `date`, `startsAt`, `status`, scores.
5. **Sync outcomes:** BracketService matches games to series by team pair, counts wins from `STATUS_FINAL` games with scores. Always writes `highSeedWins`/`lowSeedWins` (enabling live "OKC leads 3-1" UI). Sets `winnerTeamId`, `winnerWins`, `loserWins` only on series completion. Sets `firstGameStartsAt` from the earliest matching game per series. DataLoaderService also sets `Game.playoffSeriesId` FK on each postseason game load.
6. **Advance bracket:** When all first-round series in a conference have winners, BracketService creates Semifinals; when both Semifinals have winners, creates Conference Finals; when both Conference Finals have winners, creates Finals. No manual creation of later rounds.

See **AGENTS.md** (Flows, BracketService) and **services/BracketService/index.ts** for implementation.

---

## Blog data

- **Source:** Static array in the repo: `app/blog/posts.ts` (export `posts`: slug, title, date, excerpt, content).
- **Ingestion:** Cron `GET /api/cron/load-blog-posts` (Bearer `CRON_SECRET`) reads `posts` and upserts into `BlogPost` by `slug`.
- **Serving:** `GET /api/blog/posts` and `GET /api/blog/posts/[slug]` read from the database.

---

## Scripts and cron that move data

| Script / cron | Reads from | Writes to |
|---------------|------------|-----------|
| **load-games** (cron or `loadGamesForDate`) | ESPN scoreboard + box score | Season (if needed), Team, Game, PlayerGameStats |
| **load-teams** (cron or `loadTeamsAndPlayers`) | ESPN teams + per-team roster | Team, Player |
| **load-blog-posts** (cron) | `app/blog/posts.ts` | BlogPost |
| **sync-bracket** (cron) | Game (final), PlayoffSeries | PlayoffSeries (outcomes, firstGameStartsAt, new later-round series) |
| **seedPlayoffBracket.ts** | PlayoffSeed, Season | PlayoffSeries (FIRST_ROUND only) |
| **syncSeriesOutcomes.ts** | Season, Game, PlayoffSeries | PlayoffSeries (outcomes, firstGameStartsAt, advance) |

---

## Reference: key service files

- **ESPN:** `services/EspnService/index.ts` (getGamesByDate, getEventBoxScore, getAllTeams, getTeamRoster).
- **Load games + stats:** `services/DataLoaderService/index.ts` (loadGamesForDate, loadTeamsAndPlayers).
- **Bracket sync/advance:** `services/BracketService/index.ts` (syncSeriesOutcomes, advanceBracket, setSeriesFirstGameStartsAt).
- **Seasons:** `services/SeasonService/index.ts` (getOrCreateSeason, getCurrentSeason).

For API surface and product rules, see **AGENTS.md**.
