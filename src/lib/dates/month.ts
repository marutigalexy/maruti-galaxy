export const BUSINESS_TIME_ZONE = "Asia/Kolkata";

export function calendarDateInZone(
  date = new Date(),
  timeZone = BUSINESS_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function currentMonthRange(now = new Date()): { date_from: string; date_to: string } {
  const today = calendarDateInZone(now);
  return {
    date_from: `${today.slice(0, 7)}-01`,
    date_to: today,
  };
}
