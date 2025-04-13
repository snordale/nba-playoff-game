import { getEventBoxScore } from "../services/EspnService";

(async () => {
    const eventId = process.argv[2];

    if (!eventId) {
        console.error("Please provide an event ID as a command line argument.");
        return;
    }

    const boxScore = await getEventBoxScore({ eventId: eventId });

    // console.log(boxScore);
})()