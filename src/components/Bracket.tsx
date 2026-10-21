import { getTranslations } from "next-intl/server";
import { matchWinner } from "@/lib/scoring";
import { roundKey } from "@/lib/playoff";
import { participantName, type Match, type Participant } from "@/lib/tournaments";
import { MatchScore } from "./ScheduleView";

type Props = { matches: Match[]; participants: Participant[]; locale: string };

/** Playoff tree: one column per round (scrolls sideways on phones); the 3rd-place match under the final. */
export async function Bracket({ matches, participants, locale }: Props) {
  const t = await getTranslations("tournaments");
  const byId = new Map(participants.map((p) => [p.id, p]));
  const rounds = Math.max(...matches.map((m) => m.tour));
  const main = matches.filter((m) => !(m.tour === rounds && m.slot === 1));
  const third = matches.find((m) => m.tour === rounds && m.slot === 1);

  const side = (m: Match, id: string | null, winner: string | null) => {
    const p = id ? byId.get(id) : undefined;
    return (
      <div className={`truncate ${winner && id === winner ? "font-semibold text-accent" : winner ? "text-muted" : ""}`}>
        {p ? participantName(p, locale) : <span className="text-muted">—</span>}
      </div>
    );
  };

  const card = (m: Match) => {
    const winner = m.home_id && m.away_id ? matchWinner(m) : null;
    return (
      <div key={m.id} className="card w-52 space-y-1 p-2 text-sm">
        {side(m, m.home_id, winner)}
        {side(m, m.away_id, winner)}
        {(m.games?.length || m.walkover_winner_id) && (
          <div className="border-t border-border pt-1">
            <MatchScore match={m} />
          </div>
        )}
      </div>
    );
  };

  // Round 1 may be partial (byes): place cards by slot so the tree lines up.
  const slotsIn = (r: number) => 2 ** (rounds - r);

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {Array.from({ length: rounds }, (_, i) => i + 1).map((r) => (
            <div key={r} className="flex flex-col">
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{t(`round_${roundKey(r, rounds)}`)}</h3>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {Array.from({ length: slotsIn(r) }, (_, slot) => {
                  const m = main.find((x) => x.tour === r && x.slot === slot);
                  return m ? card(m) : <div key={slot} className="h-[3.25rem] w-52" aria-hidden />;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {third && (
        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{t("round_third")}</h3>
          {card(third)}
        </div>
      )}
    </div>
  );
}
