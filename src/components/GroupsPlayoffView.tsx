import { getTranslations } from "next-intl/server";
import { computeStandings } from "@/lib/standings";
import { matchWinner } from "@/lib/scoring";
import { groupLetter } from "@/lib/groups";
import { byPlaceLabel, groupOutPlaces, playoffPlaces, type GroupRow } from "@/lib/playoff";
import type { Match, Participant, Tournament } from "@/lib/tournaments";
import { StandingsTable } from "./StandingsTable";
import { ScheduleView } from "./ScheduleView";
import { Bracket } from "./Bracket";
import { StageTabs } from "./StageTabs";
import { ParticipantLabel } from "./ParticipantLabel";

type Props = { tournament: Tournament; participants: Participant[]; matches: Match[]; locale: string };

/** Public view of a groups + playoff tournament: group tables, bracket and final places (SPEC 5.6). */
export async function GroupsPlayoffView({ tournament, participants, matches, locale }: Props) {
  const t = await getTranslations("tournaments");
  const advance = tournament.advance_per_group ?? 1;
  const groupNos = [...new Set(participants.map((p) => p.group_no).filter((g): g is number => !!g))].sort((a, b) => a - b);
  const groupMatches = matches.filter((m) => m.stage === "group");
  const playoff = matches.filter((m) => m.stage === "playoff");

  const groupRows: GroupRow[] = [];
  const groups = groupNos.map((g) => {
    const parts = participants.filter((p) => p.group_no === g);
    const ms = groupMatches.filter((m) => m.group_no === g);
    const standings = computeStandings(parts.map((p) => p.id), ms);
    for (const r of standings.rows) {
      groupRows.push({ id: r.id, group: g, place: r.order + 1, points: r.points, diff: r.diff, against: r.shuttlesAgainst });
    }
    return (
      <section key={g} className="space-y-3">
        <h3 className="text-lg font-semibold">{t("groupName", { letter: groupLetter(g) })}</h3>
        <StandingsTable rows={standings.rows} unresolvedTies={standings.unresolvedTies} participants={parts} matches={ms} qualify={advance} />
        <details>
          <summary className="cursor-pointer text-sm text-accent">{t("groupSchedule")}</summary>
          <div className="mt-3">
            <ScheduleView matches={ms} participants={parts} />
          </div>
        </details>
      </section>
    );
  });

  // Final places once the playoff has started: bracket places + group non-qualifiers.
  let places: [string, string][] = [];
  if (playoff.length) {
    const rounds = Math.max(...playoff.map((m) => m.tour));
    const fromBracket = playoffPlaces(
      playoff.map((m) => ({ round: m.tour, slot: m.slot ?? 0, home: m.home_id, away: m.away_id, winner: matchWinner(m) })),
      rounds,
    );
    places = [...fromBracket, ...groupOutPlaces(groupRows, advance)].sort(([, a], [, b]) => byPlaceLabel(a, b));
  }
  const byId = new Map(participants.map((p) => [p.id, p]));

  const playoffContent = playoff.length ? (
    <div className="space-y-8">
      <Bracket matches={playoff} participants={participants} locale={locale} />
      {places.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold">{t("finalPlaces")}</h3>
          <ol className="card divide-y divide-border">
            {places.map(([id, place]) => {
              const p = byId.get(id);
              if (!p) return null;
              return (
                <li key={id} className="flex items-center gap-3 px-4 py-2">
                  <span className="w-12 text-sm font-semibold tabular-nums">{place}</span>
                  <ParticipantLabel participant={p} locale={locale} size={24} />
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  ) : (
    <div className="card p-6 text-sm text-muted">{t("playoffNotYet", { count: advance })}</div>
  );

  return (
    <StageTabs
      initial={playoff.length ? "playoff" : "groups"}
      tabs={[
        { key: "groups", label: t("tabGroups"), content: <div className="space-y-10">{groups}</div> },
        { key: "playoff", label: t("tabPlayoff"), content: playoffContent },
      ]}
    />
  );
}
