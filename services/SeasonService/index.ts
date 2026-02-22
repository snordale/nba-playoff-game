import { prisma } from "@/prisma/client";
import { fetchEspnSeasonEndDate } from "@/services/EspnService";

/**
 * Gets a season by year. Returns null if not found.
 */
export async function getSeasonByYear(year: number) {
  return prisma.season.findUnique({
    where: { year },
  });
}

/**
 * Finds the season whose playoff window [startDate, endDate] contains the given date.
 * Used for postseason games so we attach by "which season's window is this game in" rather than
 * by year (which can be ambiguous or inconsistent from the API). Returns null if none match.
 */
export async function getSeasonByDate(date: Date) {
  const d = date.getTime();
  const seasons = await prisma.season.findMany({
    where: {
      startDate: { lte: date },
      endDate: { gte: date },
    },
  });
  if (seasons.length === 0) return null;
  if (seasons.length === 1) return seasons[0];
  // Overlapping windows: pick the one whose year matches the date's year
  const year = date.getUTCFullYear();
  return seasons.find((s) => s.year === year) ?? seasons[0]!;
}

/**
 * Gets or creates a season for the given year.
 *
 * Start date is initially April 1 — a conservative stub that gets narrowed to
 * the actual first postseason game date by updateSeasonStartIfEarlier() the
 * first time loadGamesForDate processes a postseason event.
 *
 * End date is fetched from ESPN's season metadata so it stays accurate across
 * years without any hardcoded table. Falls back to June 30 if ESPN is
 * unreachable.
 */
export async function getOrCreateSeason(year: number) {
  const existing = await getSeasonByYear(year);
  if (existing) return existing;

  const startDate = new Date(`${year}-04-01T00:00:00Z`);
  const espnEnd = await fetchEspnSeasonEndDate(year);
  const endDate = espnEnd ?? new Date(`${year}-06-30T23:59:59Z`);
  const displayName = `${year - 1}-${String(year).slice(-2)}`;

  return prisma.season.create({
    data: { year, startDate, endDate, displayName },
  });
}

/**
 * Narrows the season's startDate to candidateDate if candidateDate is earlier
 * than the current startDate. Called by DataLoaderService when the first
 * postseason game is encountered so the season window reflects actual playoff
 * dates rather than the April 1 stub.
 */
export async function updateSeasonStartIfEarlier(year: number, candidateDate: Date) {
  const season = await getSeasonByYear(year);
  if (!season) return;
  if (candidateDate < season.startDate) {
    await prisma.season.update({
      where: { year },
      data: { startDate: candidateDate },
    });
  }
}

/**
 * Gets the "current" season: most recent with endDate >= today, or latest by year.
 */
export async function getCurrentSeason() {
  const now = new Date();
  const current = await prisma.season.findFirst({
    where: { endDate: { gte: now } },
    orderBy: { year: "asc" },
  });
  if (current) return current;

  return prisma.season.findFirst({
    orderBy: { year: "desc" },
  });
}

/**
 * Lists all seasons, newest first.
 */
export async function listSeasons() {
  return prisma.season.findMany({
    orderBy: { year: "desc" },
  });
}
