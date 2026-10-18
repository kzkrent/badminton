import { getTranslations } from "next-intl/server";
import { participantName, type Match, type Participant } from "@/lib/tournaments";
import { ParticipantLabel } from "./ParticipantLabel";

type Props = { matches: Match[]; participants: Participant[]; locale: string };

/** Matches grouped by tour, with who rests in each tour. */
export async function ScheduleView({ matches, participants, locale }: Props) {
  const t = await getTranslations("tournaments");
  const byId = new Map(participants.map((p) => [p.id, p]));
  const tours = [...new Set(matches.map((m) => m.tour))].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {tours.map((tour) => {
        const inTour = matches.filter((m) => m.tour === tour);
        const playing = new Set(inTour.flatMap((m) => [m.home_id, m.away_id]));
        const resting = participants.filter((p) => !playing.has(p.id));
        return (
          <div key={tour} className="card overflow-hidden">
            <h3 className="border-b border-border bg-background px-4 py-2 text-sm font-semibold">
              {t("tour", { n: tour })}
            </h3>
            <ul className="divide-y divide-border">
              {inTour.map((m) => {
                const home = byId.get(m.home_id);
                const away = byId.get(m.away_id);
                if (!home || !away) return null;
                return (
                  <li key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2 text-sm">
                    <ParticipantLabel participant={home} locale={locale} size={24} />
                    <span className="text-center text-xs whitespace-nowrap text-muted">
                      {m.games ? m.games.map(([h, a]) => `${h}:${a}`).join(", ") : t("notPlayed")}
                    </span>
                    <span className="flex justify-end text-right">
                      <ParticipantLabel participant={away} locale={locale} size={24} />
                    </span>
                  </li>
                );
              })}
            </ul>
            {resting.length > 0 && (
              <p className="border-t border-border px-4 py-2 text-xs text-muted">
                {t("rests", { names: resting.map((p) => participantName(p, locale)).join(", ") })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
