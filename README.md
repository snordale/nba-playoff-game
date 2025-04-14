# NBA Playoff Game

NBA Playoff Game: Pick one player every day for the entire NBA Playoffs and maximize your points.

## Overview

This is a web game that occurs during the NBA Playoffs. Make a group, invite friends, then everyone picks one player per day for the NBA playoffs. You receive scores points based on your picks' points, assists, turnovers, rebounds, blocks, and steals. You cannot pick the same player twice. Whoever has the most points at the end of the playoffs wins.

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

## Scoring System

The application processes game statistics fetched from ESPN for:
- Points
- Assists
- Rebounds
- Steals
- Blocks
- Turnovers

Scores for user submissions are calculated dynamically when viewing group data based on the loaded player statistics.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is private and proprietary.