# NBA Playoff Game

NBA Playoff Game: Pick one player every day for the entire NBA Playoffs and maximize your points.

## Overview

This is a web game that occurs during the NBA Playoffs. Make a group, invite friends, then everyone picks one player per day for the NBA playoffs. You receive scores points based on your picks' points, assists, turnovers, rebounds, blocks, and steals. You cannot pick the same player twice. Whoever has the most points at the end of the playoffs wins.

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
- Automated scoring updates using ESPN box scores
- User prediction submissions
- Player performance tracking (points, assists, rebounds, steals, blocks, turnovers)
- Team-based player filtering
- Automated daily score updates

## Project Structure

```
├── app/                  # Next.js application routes and pages
├── components/          # React components
├── services/           # Backend services
│   ├── ScoringService/ # Handles game scoring and statistics
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
- `npm run update-scores` - Update player scores from previous day's games

## Scoring System

The application automatically processes game statistics for:
- Points
- Assists
- Rebounds
- Steals
- Blocks
- Turnovers

Data is fetched from ESPN's box scores and processed daily to update user submissions.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is private and proprietary.