# NBA Playoff Game

NBA Playoff Game: Pick one player every day for the entire NBA Playoffs and maximize your points.

## Overview

This is a web game that occurs during the NBA Playoffs. Make a group, invite friends, then everyone picks one player per day for the NBA playoffs. You receive scores points based on your picks' points, assists, turnovers, rebounds, blocks, and steals. You cannot pick the same player twice. Whoever has the most points at the end of the playoffs wins. Submission lock in once the game starts, and you can only submit a player whose game has not started.

## Scoring

points: 1
rebounds: 1
assists: 2
steals: 2
blocks: 2
turnovers: -2

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
├── prisma/             # Database schema and migrations
└── scripts/            # Utility scripts for maintenance
```

## Getting Started

1. **Prerequisites**
   - Node.js (Latest LTS version)
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
   GOOGLE_CLIENT_ID="your-google-client-id" # From Google Cloud Console
   GOOGLE_CLIENT_SECRET="your-google-client-secret" # From Google Cloud Console
   ```

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
- `npx tsx scripts/loadGames.ts [YYYY-MM-DD]` - Manually load game and player stats from ESPN for a specific date (defaults to today).
- `npx tsx scripts/loadAllPlayoffGames.ts` - Load game and player stats from ESPN for the entire playoff date range defined in the script.
- `npx tsx scripts/logDate.ts [YYYY-MM-DD]` - Log game and player stats from the database for a specific date (defaults to today).
- `npx tsx scripts/loadTeamsAndPlayers.ts` - Fetch all teams and their full rosters from ESPN to populate/update the main Team and Player database tables. Should be run periodically (e.g., once before playoffs, occasionally if trades happen).

## Scoring System

The application processes game statistics fetched from ESPN for:
- Points
- Assists
- Rebounds
- Steals
- Blocks
- Turnovers

Scores for user submissions are calculated dynamically when viewing group data based on the loaded player statistics.

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