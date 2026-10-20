import type { createFormatter, DateTimeFormatOptions } from "next-intl";

type Formatter = ReturnType<typeof createFormatter>;

/** "24 Oct 2026" or "24 Oct – 26 Dec 2026" for multi-day tournaments; null without a start date. */
export function formatTournamentDates(
  format: Formatter,
  t: { starts_on: string | null; ends_on: string | null },
  options: DateTimeFormatOptions = { dateStyle: "medium" },
): string | null {
  if (!t.starts_on) return null;
  const o: DateTimeFormatOptions = { ...options, timeZone: "UTC" };
  const start = new Date(t.starts_on);
  if (!t.ends_on || t.ends_on === t.starts_on) return format.dateTime(start, o);
  return format.dateTimeRange(start, new Date(t.ends_on), o);
}
