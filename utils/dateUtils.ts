import { format, fromZonedTime, toZonedTime } from "date-fns-tz";

const TIMEZONE = "America/New_York";

export function parseDateToNY(dateString: string): Date {
  return fromZonedTime(`${dateString}T00:00:00`, TIMEZONE);
}

export function formatDateToNY(date: Date): string {
  return format(toZonedTime(date, TIMEZONE), "yyyy-MM-dd", {
    timeZone: TIMEZONE,
  });
}

export function formatDisplayDate(date: Date): string {
  return format(toZonedTime(date, TIMEZONE), "MMMM d, yyyy", {
    timeZone: TIMEZONE,
  });
}
