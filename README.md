# NBA Playoff Game

NBA Playoff Game: Two group-based games during the NBA Playoffs—**Daily Picks** (one player per day, fantasy scoring) and **Series Bracket** (pick series winner + games, round-based points with underdog bonus).

## Overview

- **Daily Picks:** Each day, each user picks one player from any game. One pick per player per playoffs; points from box stats (PTS, REB, AST, STL, BLK, TO). Submissions lock when the game starts.
- **Series Bracket:** Before each series, pick the winner and total games (4–7). Points by round; correct games add a bonus; underdog picks get a 50% premium.

Make a group, invite friends, then play both games for the selected season. Leaderboards are per game. Before a season is configured (pre-playoff), users can still create and join groups and invite friends; the group page shows a pre-playoff message until playoff dates and series are set.

**Documentation:** **README.md** (this file) – getting started, env, scripts. **AGENTS.md** – product rules, APIs, conventions, key files (for agents and developers). **DATA.md** – data sources and pipelines (ESPN, DB, cron). Keep all three updated when you change behavior, APIs, or data.

## Scoring

points: 1
rebounds: 1
assists: 2
steals: 2
blocks: 2
turnovers: -2

## Submission Visibility Rules

The game implements strategic pick hiding to maintain fair competition:

- **Your Own Picks**: You can always see your own picks and their scores
- **Other Players' Picks**: 
  - Hidden until the game starts or the game status changes from 'SCHEDULED'
  - Once a game starts, both the player picked and their score become visible to everyone
  - For future games, you can see who has submitted a pick but not which player they chose
- **Calendar View**: 
  - Past dates: Shows all picks and scores
  - Future dates: Shows who has submitted (in green) but hides the actual picks
- **Daily View**: 
  - Locked games: Shows all picks and detailed stats (points, rebounds, assists, etc.)
  - Future/scheduled games: Only shows your own pick, others show as "Hidden"

## Tech Stack

- **Frontend**: Next.js, React, Chakra UI, Radix UI
- **Backend**: Next.js API Routes
- **Database**: Prisma ORM
- **Authentication**: NextAuth.js
- **State Management**: React Query
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Key Features

- Real-time NBA game statistics tracking
- User prediction submissions (one unique player pick per day)
- Group creation and management
- Invite friends to groups via shareable links
- Dynamic scoring based on player performance (Points, Assists, Rebounds, Steals, Blocks, Turnovers)
- Group leaderboard and daily results calendar
- Google OAuth Authentication

## Project Structure

```
├── app/                  # Next.js application routes and pages
├── components/          # React components
├── services/           # Backend services (API fetching, game loading)
│   └── EspnService/    # ESPN API integration
|   |-- ApiService/     # API service for fetching data
|   |-- DataLoaderService/    # Data loading
|   |-- ScoringService/     # Scoring service for calculating scores
├── prisma/             # Database schema and migrations
├── react-query/        # Request hooks for frontend
└── scripts/            # Utility scripts for maintenance
```

## Database Schema Overview

The database schema is defined in `prisma/schema.prisma` and managed by Prisma ORM. Key models include:

*   **`User`**: Stores user authentication details (email, username, image). Linked to `GroupUser` (memberships) and `Submission` (picks).
*   **`Group`**: Represents a user-created group with a unique name. Linked to `GroupUser`.
*   **`GroupUser`**: A join table connecting `User` and `Group`, indicating group membership and admin status. Also linked to `Submission`.
*   **`Team`**: Stores NBA team information (name, ESPN ID, abbreviation, logo). Linked to `Game` (as home/away team) and `Player` (current team).
*   **`Player`**: Stores player details (name, ESPN ID, image, current team). Linked to `Team`, `PlayerGameStats`, and `Submission`.
*   **`Game`**: Represents an NBA game (ESPN ID, date, start time, teams, score, status). Linked to `Team` (home/away), `PlayerGameStats`, and `Submission`.
*   **`PlayerGameStats`**: Holds the statistical performance of a `Player` in a specific `Game` (points, rebounds, assists, etc.).
*   **`Submission`**: The core gameplay entity, representing a `User`'s pick (`Player`) for a specific `Game` within the context of a `GroupUser` membership.
*   **Bracket (Series) game:** **`Season`** (year, start/end dates), **`PlayoffSeed`** (conference + seed → team), **`PlayoffSeries`** (round, teams, winner, firstGameStartsAt), **`SeriesPick`** (user’s winner + games count per series). See **AGENTS.md** for full schema.
*   **`BlogPost`**: For storing blog post content (likely separate from core game logic).

## Getting Started

1. **Prerequisites**
   - Node.js **24+** (see `engines` in package.json; use `.nvmrc` with nvm: `nvm use`)
   - npm or yarn
   - PostgreSQL database

2. **Installation**
   ```bash
   # Install dependencies
   npm install

   # Generate Prisma client
   npm run prisma:generate

   # Run database migrations
   npm run prisma:migrate
   ```


3. **Environment Setup**
   Create a `.env` file with the following variables:
   ```
   DATABASE_URL="your-database-url"
   NEXTAUTH_SECRET="your-nextauth-secret" # Generate a strong secret: openssl rand -base64 32
   NEXTAUTH_URL="http://localhost:3000" # Adjust for production
   JWT_INVITE_SECRET="your-super-strong-random-secret-key-here" # Used for signing group invite links
   CRON_SECRET="your-cron-secret" # Required for cron routes: load-games, sync-bracket, load-teams, load-blog-posts
   GOOGLE_CLIENT_ID="your-google-client-id" # From Google Cloud Console
   GOOGLE_CLIENT_SECRET="your-google-client-secret" # From Google Cloud Console
   ADMIN_EMAIL="your-admin@example.com" # Admin panel and admin API access (or ADMIN_EMAILS for comma-separated list)
   ```
   See `.env.example` for a full checklist (no secrets).

4. **Development**
   ```bash
   npm run dev
   ```

5. **Production Build**
   ```bash
   npm run build
   npm start
   ```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:deploy` - Deploy database migrations
- `npm run update-scores` - Fetch game and player stats from ESPN for today (equivalent to `npx tsx scripts/loadGames.ts`).
- `npx tsx scripts/loadGames.ts [YYYY-MM-DD]` - Manually load game and player stats from ESPN for a specific date (defaults to today).
- `npx tsx scripts/loadAllGames.ts [year]` - Load games for a full season (uses Season from DB; default current year).
- `npx tsx scripts/loadTeamsAndPlayers.ts` - Fetch all teams and rosters from ESPN. Run before playoffs and occasionally for trades.
- `npx tsx scripts/seedPlayoffBracket.ts [year]` - Create first-round PlayoffSeries from PlayoffSeeds.
- `npx tsx scripts/syncSeriesOutcomes.ts [year]` - Sync series outcomes and first-game times from games, then auto-create Semifinals / Conference Finals / Finals.

Cron (Vercel or similar): `GET /api/cron/load-games`, `GET /api/cron/sync-bracket` (Bearer `CRON_SECRET`). See **AGENTS.md** for full API and automation.

## Scoring System

The application processes game statistics fetched from ESPN for:
- Points (1)
- Assists (2)
- Rebounds (1)
- Steals (2)
- Blocks (2)
- Turnovers (-2)

Scores for user submissions are calculated dynamically when viewing group data based on the loaded player statistics.

## Requirements
- Users log in with Google; create groups; invite people via shareable links.
- **Daily Picks:** One player per day; cannot pick the same player twice; points from box stats; pick locks when the game starts; leaderboard and list/calendar of days with picks and scores; pending picks of others are hidden until the game starts.
- **Series Bracket:** Before each series, pick winner and total games (4–7); round-based scoring with underdog premium; separate bracket leaderboard. See AGENTS.md for scoring and locking.

## Key Concepts & Notes

*   **`game.date` vs `game.startsAt`:** Be mindful of the difference between these two `Game` model fields.
    *   `game.date` (Date): Represents the calendar date of the game (YYYY-MM-DD), stored in 'America/New_York'. Use this primarily for associating submissions/games with a specific *day* (e.g., finding daily submissions, grouping by date).
    *   `game.startsAt` (DateTime): Represents the exact date and time the game starts (including timezone). Use this for checks related to game locking (e.g., preventing submissions after the game has started, determining if a pick's details can be revealed).
*   **Timezones:** Game scheduling and locking logic heavily rely on correct timezone handling. Game times are fetched and stored relative to 'America/New_York'. Date comparisons (e.g., finding submissions for "today") often use UTC start/end of day calculations (e.g., via `date-fns` `startOfDay` combined with `setUTCHours`).
*   **Data Loading:** The `DataLoaderService` (using `EspnService`) is crucial for fetching game schedules, player rosters, and daily stats. The `scripts/loadGames.ts` script needs to run regularly during the playoffs.
*   **Scoring:** Scores are calculated dynamically based on fetched `PlayerGameStats` using weights defined directly within the relevant API routes (e.g., `app/api/groups/[groupId]/route.ts` as of writing).
*   **Authentication:** `NextAuth.js` with the Google Provider handles authentication. API routes typically verify the user session using the `auth()` helper from `@/auth`.
*   **State Management:** `react-query` is used on the frontend to fetch and cache data from the Next.js API routes. Custom hooks for data fetching are often defined in `react-query/`.
*   **Seasons & dates:** Playoff date range is driven by the **Season** table (`startDate`, `endDate`). Create seasons in Admin; cron and scripts use the DB season. Legacy constants may exist in `@/constants` but are not the source of truth.

## Core Game Mechanics Verification

- **Data Loading:** The application uses two main data loading processes:
  - **Daily Game/Stat Loading:** Game schedules and detailed player performance stats for a specific date are fetched via `scripts/loadGames.ts` (using `loadGamesForDate` internally). This needs to be run regularly (e.g., daily via cron) during the playoffs to update scores. Game dates are stored in the 'America/New_York' timezone.
  - **Full Roster Loading:** The master list of all teams and players (including names, images, current team) is populated/updated using `scripts/loadTeamsAndPlayers.ts` (using `loadTeamsAndPlayers` internally). This should be run initially and periodically as needed.
- **Data Integrity:** Fetched data (games, players, stats) is correctly stored in the Prisma database.
- **Data Retrieval:** Group data, including dynamically calculated scores, is correctly pulled by the frontend.
- **Submissions:** Users can create and update one submission per day before the game locks.
    - Validation prevents picking the same player on different days.
    - Validation prevents submitting after the game starts.
- **Account Creation:** Uses NextAuth.js with Google OAuth.
- **Group Management:** Users can create groups and invite others.
- **Submission Visibility:**
    - Past/locked submissions: Player names and scores are visible to all group members (List & Calendar).
    - Future/unlocked submissions: Player *names* are hidden until the game locks (List & Calendar View). The Calendar view shows all members' usernames, colored green if they have submitted for that future date and orange if they haven't.
- **Leaderboard Accuracy:** Scores are calculated based on defined rules and fetched stats, providing an accurate leaderboard.

## Pre-Launch Checklist (Simplified for Friends & Family)

### Environment
- [X] Set up production database
- [X] Configure SSL/TLS certificates (if hosting publicly)
- [ ] Review and set all required environment variables (`.env`)

### Testing & Validation
- [ ] Test group invite flow end-to-end
- [ ] Verify submission validation logic (one pick per day, game start lock, no duplicate players)
- [ ] Test scoring calculation accuracy
- [ ] Verify timezone handling for game schedules/locking
- [ ] Test basic error handling (e.g., failed submissions)
- [ ] Verify data loading script (`loadGames.ts`) works
- [ ] Validate mobile responsiveness

### User Experience
- [X] Add loading states for async operations (Implemented)
- [X] Implement basic error messages and notifications (Toasts added)
- [X] Test mobile responsiveness (Seems OK, further testing recommended)
- [X] Implement proper toast notifications for actions (Implemented for submissions)
- [X] Add error boundaries for component failures (Implemented)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is private and proprietary.