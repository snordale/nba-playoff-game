import { loadGamesForDate } from "@/services/DataLoaderService";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  const qpString = request.url.split('?')[1];
  const queryParams = new URLSearchParams(qpString);
  const date = queryParams.get('date');
  const timeZone = "America/Los_Angeles";
  let dateStringForLA: string;

  if (date) {
    // Assuming 'date' is in 'YYYY-MM-DD' format from the query param.
    // This string already represents the desired calendar date in LA.
    // Add validation for robustness.
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        return new Response('Invalid date format. Use YYYY-MM-DD.', { status: 400 });
    }
    dateStringForLA = date;
  } else {
    // Get current date string in LA timezone ('YYYY-MM-DD' format)
    // Use Intl.DateTimeFormat for reliable timezone handling.
    const formatter = new Intl.DateTimeFormat('en-CA', { // 'en-CA' locale often gives YYYY-MM-DD
      timeZone: timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dateStringForLA = formatter.format(new Date());
  }

  // Create a Date object representing midnight UTC on that calendar day.
  // This avoids unreliable local string parsing. It's often sufficient if
  // the consuming function (loadGamesForDate) correctly handles UTC or
  // primarily needs the Year/Month/Day components.
  // NOTE: For true timezone-aware operations (e.g., representing midnight *in LA*),
  // using a dedicated library like 'date-fns-tz' is strongly recommended.
  const targetDate = new Date(`${dateStringForLA}T00:00:00Z`); // Z indicates UTC

  console.log("Loading games for date (UTC midnight):", dateStringForLA); // Log the unambiguous date string
  await loadGamesForDate(targetDate);
  console.log("Games loaded for date:", dateStringForLA);

  return NextResponse.json("Get some");
}
