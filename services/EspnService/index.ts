// Assuming ESPN API provides these IDs - adjust if necessary
interface ESPNAthleteRef {
  id?: string; // Crucial if available
  uid?: string;
  guid?: string;
  displayName: string;
}

interface ESPNTeamRef {
  id?: string; // Crucial if available
  uid?: string;
  abbreviation?: string;
  displayName: string;
}

interface ESPNRawStats {
  keys: string[];
  athletes: Array<{
    athlete: ESPNAthleteRef;
    stats: string[];
  }>;
}

// Updated interfaces to match ESPN API response
interface ESPNPlayerStats {
  active: boolean;
  athlete: ESPNAthleteRef;
  starter: boolean;
  didNotPlay: boolean;
  reason?: string;
  ejected: boolean;
  stats: string[]; // Array of stat values in order
}

interface ESPNTeamBoxScore {
  team: ESPNTeamRef;
  statistics: Array<{
    name: string;
    displayValue: string;
    label: string;
    abbreviation?: string;
  }>;
  athletes: ESPNPlayerStats[];
  totals: string[];
}

// Roster information often available separately
interface ESPNRosterAthlete {
  athlete: ESPNAthleteRef;
  starter?: boolean;
  active?: boolean;
  didNotPlay?: boolean;
  ejected?: boolean;
  statsSummary?: { displayValue: string }; // Summary, not detailed stats array
  stats?: string[]; // Likely empty until game final
}

interface ESPNRosterTeam {
  team: ESPNTeamRef;
  athletes: ESPNRosterAthlete[];
}

// Updated BoxScore interface to potentially include rosters
export interface ESPNBoxScore {
  teams: ESPNTeamBoxScore[];
  rosters?: ESPNRosterTeam[]; // Add optional rosters
}

// Define stat indices based on ESPN's order
const STAT_INDICES = {
  minutes: 0,        // "31" (minutes played)
  points: 13,        // "31" (points scored)
  rebounds: 6,       // Total rebounds (offensive + defensive)
  assists: 7,        // Assists
  steals: 8,         // Steals
  blocks: 9,         // Blocks
  turnovers: 10,     // Turnovers
};

// Refined ESPNEvent structure based on header API needs
export interface ESPNEvent {
  id: string; // This is the gameId (espnId in our schema)
  name: string;
  shortName: string;
  date: string; // ISO format string
  status: {
    type: {
      name: string; // e.g., STATUS_SCHEDULED, STATUS_FINAL
      completed: boolean;
    };
  };
  competitions: Array<{
    id: string;
    competitors: Array<{
      id: string; // Team ESPN ID
      uid: string;
      type: string; // "team"
      order: number;
      homeAway: "home" | "away";
      team: ESPNTeamRef;
      score?: string; // Score might be here or in boxscore
    }>;
  }>;
}

/**
 * Formats a date into YYYYMMDD format required by ESPN API.
 * Ensures the date is formatted in the correct timezone for ESPN's API.
 */
const formatDateForEspn = (date: Date): string => {
  // Get date components in local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * Fetches NBA games (events) for a specific date from ESPN's header API.
 * Returns essential game details including ESPN IDs.
 * @param date - Date to fetch games for.
 * @returns Array of ESPN events.
 */
export const getGamesByDate = async ({ date }: { date: Date }): Promise<ESPNEvent[]> => {
  try {
    const formattedDate = formatDateForEspn(date);

    console.log(`Fetching ESPN game events for date: ${date.toLocaleDateString()}`);
    // Updated URL to use the correct ESPN API endpoint for NBA games
    const espnHeaderDataUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${formattedDate}`;

    const response = await fetch(espnHeaderDataUrl);

    if (!response.ok) {
      throw new Error(`ESPN API (header) returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // The events are directly in the response
    const events = data?.events;

    if (!Array.isArray(events)) {
      console.log("No events found in ESPN API response for", date.toLocaleDateString());
      return [];
    }

    console.log(`Found ${events.length} ESPN game events for ${date.toLocaleDateString()}`);
    return events as ESPNEvent[]; // Cast to our refined interface
  } catch (error) {
    console.error("Error fetching ESPN game events:", error);
    throw new Error(`Failed to fetch ESPN game events: ${error.message}`);
  }
};

/**
 * Fetches detailed box score data for a specific ESPN game event.
 * @param eventId - ESPN game event ID (espnId in our schema).
 * @returns Detailed box score data.
 */
export const getEventBoxScore = async ({ eventId }: { eventId: string }): Promise<ESPNBoxScore | null> => {
  try {
    console.log(`Fetching ESPN box score for event ID: ${eventId}`);
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`ESPN API (summary) returned ${response.status} for event ${eventId}`);
      if (response.status === 404) {
        return null;
      }
      throw new Error(`ESPN API (summary) returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    // Remove diagnostic logs
    // if (data.boxscore?.players) { ... }
    
    // Check for the necessary structure
    if (!data.boxscore?.players || !Array.isArray(data.boxscore.players)) {
      console.warn(`No boxscore.players array found in ESPN API response for event ${eventId}`);
      return null;
    }

    // Transform the data using the boxscore.players structure
    const transformedBoxScore: ESPNBoxScore = {
      teams: data.boxscore.players.map(playerTeamGroup => {
        // Assuming the statistics array always holds one object with keys and athletes
        const statsDefinition = playerTeamGroup.statistics?.[0];
        if (!statsDefinition?.athletes) {
          console.warn(`Missing statsDefinition or athletes for team ${playerTeamGroup.team?.id} in event ${eventId}`);
          // Return a partial team structure or handle error as appropriate
          return {
            team: {
              id: playerTeamGroup.team?.id,
              displayName: playerTeamGroup.team?.displayName,
              abbreviation: playerTeamGroup.team?.abbreviation
            },
            statistics: [], // Indicate missing detailed stats structure
            athletes: [],
            totals: []
          };
        }
        
        // TODO: Optionally verify statsDefinition.keys against STAT_INDICES
        // console.log("API Stat Keys:", statsDefinition.keys);

        return {
          team: {
            id: playerTeamGroup.team.id,
            displayName: playerTeamGroup.team.displayName,
            abbreviation: playerTeamGroup.team.abbreviation
          },
          statistics: [], // We don't currently store the definitions, could add if needed
          athletes: statsDefinition.athletes.map(athleteData => ({
            active: athleteData.active,
            athlete: {
              id: athleteData.athlete.id,
              displayName: athleteData.athlete.displayName
            },
            starter: athleteData.starter,
            didNotPlay: athleteData.didNotPlay,
            reason: athleteData.reason,
            ejected: athleteData.ejected,
            stats: athleteData.stats // Directly use the stats array from this structure
          })),
          totals: statsDefinition.totals || [] // Use totals from this structure if available
        };
      })
      // We likely don't need the separate `rosters` property anymore
      // rosters: data.rosters?.map(...) 
    };

    // Remove the redundant roster extraction logic added previously
    // if (data.rosters && Array.isArray(data.rosters)) { ... }

    return transformedBoxScore;
  } catch (error) {
    console.error(`Error fetching ESPN box score for event ${eventId}:`, error);
    throw new Error(`Failed to fetch ESPN box score for event ${eventId}: ${error.message}`);
  }
};

/**
 * Fetches all box scores for games on a specific date.
 * Note: This might be less useful now, as ScoringService will likely fetch games first,
 * then fetch box scores one by one based on the game's espnId.
 * Kept for potential utility or testing.
 * @param date - Date to fetch box scores for.
 * @returns Array of box scores (or nulls if fetch failed).
 */
export const getBoxScoresByDate = async ({ date }: { date: Date }): Promise<Array<ESPNBoxScore | null>> => {
  try {
    const todaysEvents = await getGamesByDate({ date });

    if (!todaysEvents || todaysEvents.length === 0) return [];

    console.log(`Fetching ${todaysEvents.length} box scores for date: ${date.toISOString().split("T")[0]}`);

    // Use Promise.allSettled to handle potential errors for individual box scores
    const results = await Promise.allSettled(
      todaysEvents.map(event => getEventBoxScore({ eventId: event.id }))
    );

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Failed to fetch box score: ${result.reason}`);
        return null; // Indicate failure for this specific box score
      }
    });

  } catch (error) {
    console.error("Error fetching multiple box scores:", error);
    throw new Error(`Failed to fetch box scores by date: ${error.message}`);
  }
};
