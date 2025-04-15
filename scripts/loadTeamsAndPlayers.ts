// scripts/loadTeamsAndPlayers.ts
import { loadTeamsAndPlayers } from "../services/DataLoaderService";

/**
 * Main function to iterate through playoff dates and load games.
 */
async function main() {
    console.log("Loading teams and players from ESPN API...");
    await loadTeamsAndPlayers();
    console.log("Teams and players loaded from ESPN API.");
}

main();