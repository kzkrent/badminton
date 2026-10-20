import { getFormatter, getTranslations } from "next-intl/server";
import { daysUntil } from "@/lib/dates";
import { tournamentAnnouncement, tournamentVenue, type Tournament } from "@/lib/tournaments";

/** Link for a free-text contact: URLs and phone numbers become clickable. */
function ContactLink({ contact }: { contact: string }) {
  if (/^https?:\/\//i.test(contact)) {
    return (
      <a href={contact} target="_blank" rel="noopener" className="break-all text-accent hover:underline">
        {contact.replace(/^https?:\/\//i, "")}
      </a>
    );
  }
  if (/^\+?[\d\s()-]{7,}$/.test(contact)) {
    return (
      <a href={`tel:${contact.replace(/[^\d+]/g, "")}`} className="text-accent hover:underline">
        {contact}
      </a>
    );
  }
  return <span className="font-medium">{contact}</span>;
}

/** Countdown badge: "today", "tomorrow", "in N days"; nothing once the date has passed. */
export async function Countdown({ date }: { date: string | null }) {
  if (!date) return null;
  const days = daysUntil(date);
  if (days < 0) return null;
  const t = await getTranslations("announce");
  return (
    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
      {t("countdown", { days })}
    </span>
  );
}

/** Date, time, venue, announcement text and how to register. */
export async function AnnouncementDetails({
  tournament: t,
  locale,
  clampText = false,
}: {
  tournament: Tournament;
  locale: string;
  clampText?: boolean;
}) {
  const ta = await getTranslations("announce");
  const format = await getFormatter();
  const venue = tournamentVenue(t, locale);
  const text = tournamentAnnouncement(t, locale);
  const when = [
    t.starts_on && format.dateTime(new Date(t.starts_on), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
    t.start_time?.slice(0, 5),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-2 text-sm">
      {(when || t.starts_on) && (
        <p className="flex flex-wrap items-center gap-2">
          <span aria-hidden>📅</span>
          <span>{when}</span>
          <Countdown date={t.starts_on} />
        </p>
      )}
      {venue && (
        <p className="flex gap-2">
          <span aria-hidden>📍</span>
          <span>{venue}</span>
        </p>
      )}
      {text && <p className={`whitespace-pre-line text-muted ${clampText ? "line-clamp-3" : ""}`}>{text}</p>}
      {t.registration_contact && (
        <p className="flex flex-wrap gap-x-2">
          <span className="text-muted">{ta("register")}:</span>
          <ContactLink contact={t.registration_contact} />
        </p>
      )}
    </div>
  );
}
