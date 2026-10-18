"use client";

import { useLocale, useTranslations } from "next-intl";
import { displayGames } from "@/lib/scoring";
import { participantName, type Match, type Participant } from "@/lib/tournaments";
import { ParticipantLabel } from "./ParticipantLabel";

type Props = { matches: Match[]; participants: Participant[]; target: number; tours?: number[] };

/** Score with the winner's games emphasised; walkovers marked. */
export function MatchScore({ match, target }: { match: Match; target: number }) {
  const t = useTranslations("tournaments");
  const ts = useTranslations("standings");
  const games = displayGames(match, target);
  if (!games) return <span className="text-xs text-muted">{t("notPlayed")}</span>;
  return (
    <span className="text-xs whitespace-nowrap tabular-nums">
      {games.map(([h, a], i) => (
        <span key={i}>
          {i > 0 && ", "}
          <span className={h > a ? "font-semibold" : ""}>{h}</span>:<span className={a > h ? "font-semibold" : ""}>{a}</span>
        </span>
      ))}
      {match.walkover_winner_id && <span className="ml-1 text-muted">({ts("walkoverShort")})</span>}
    </span>
  );
}

/** Matches grouped by tour, with who rests in each tour. */
export function ScheduleView({ matches, participants, target, tours }: Props) {
  const t = useTranslations("tournaments");
  const locale = useLocale();
  const byId = new Map(participants.map((p) => [p.id, p]));
  const allTours = [...new Set(matches.map((m) => m.tour))].sort((a, b) => a - b);
  const shown = tours ? allTours.filter((x) => tours.includes(x)) : allTours;

  return (
    <div className="space-y-4">
      {shown.map((tour) => {
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
                  <li key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 text-sm sm:gap-3 sm:px-4">
                    <ParticipantLabel participant={home} locale={locale} size={24} photosOnMobile={false} />
                    <span className="text-center">
                      <MatchScore match={m} target={target} />
                    </span>
                    <span className="flex min-w-0 justify-end text-right">
                      <ParticipantLabel participant={away} locale={locale} size={24} photosOnMobile={false} />
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
