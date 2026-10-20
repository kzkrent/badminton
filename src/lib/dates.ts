/** The league plays on Koh Samui: "today" is Bangkok time. */
export const LEAGUE_TZ = "Asia/Bangkok";

export function todayInLeague(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: LEAGUE_TZ });
}

/** Whole days from today (league time) to a YYYY-MM-DD date; negative if it has passed. */
export function daysUntil(date: string, now = new Date()): number {
  const ms = Date.parse(`${date}T00:00:00Z`) - Date.parse(`${todayInLeague(now)}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}
