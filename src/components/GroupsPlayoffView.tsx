import { getTranslations } from "next-intl/server";
import { computeStandings } from "@/lib/standings";
import { matchWinner } from "@/lib/scoring";
import { groupLetter } from "@/lib/groups";
import {
  byPlaceLabel,
  groupOutPlaces,
  playoffPlaces,
  rankWildcards,
  seedQualifiers,
  wildcardCount,
  type GroupRow,
} from "@/lib/playoff";
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
  const ts = await getTranslations("standings");
  const advance = tournament.advance_per_group ?? 1;
  const groupNos = [...new Set(participants.map((p) => p.group_no).filter((g): g is number => !!g))].sort((a, b) => a - b);
  const groupMatches = matches.filter((m) => m.stage === "group");
  const playoff = matches.filter((m) => m.stage === "playoff");

  const groupRows: GroupRow[] = [];
  const tables = groupNos.map((g) => {
    const parts = participants.filter((p) => p.group_no === g);
    const ms = groupMatches.filter((m) => m.group_no === g);
    const standings = computeStandings(parts.map((p) => p.id), ms);
    for (const r of standings.rows) {
      groupRows.push({
        id: r.id,
        group: g,
        place: r.order + 1,
        played: r.played,
        points: r.points,
        diff: r.diff,
        against: r.shuttlesAgainst,
      });
    }
    return { g, parts, ms, standings };
  });

  // Who reaches the playoff: once built — whoever is in it; before — the projection from the current tables.
  const inPlayoff = new Set(playoff.flatMap((m) => [m.home_id, m.away_id]).filter((x): x is string => !!x));
  const qualified = playoff.length
    ? inPlayoff
    : new Set(seedQualifiers(groupRows, advance, tournament.fill_bracket).map((q) => q.id));
  const wildcards = new Set(groupRows.filter((r) => r.place > advance && qualified.has(r.id)).map((r) => r.id));
  const candidates = tournament.fill_bracket ? rankWildcards(groupRows, advance) : [];
  const extraSpots = tournament.fill_bracket
    ? wildcardCount(groupRows.filter((r) => r.place <= advance).length, candidates.length)
    : 0;

  const groups = tables.map(({ g, parts, ms, standings }) => (
    <section key={g} className="space-y-3">
      <h3 className="text-lg font-semibold">{t("groupName", { letter: groupLetter(g) })}</h3>
      <StandingsTable
        rows={standings.rows}
        unresolvedTies={standings.unresolvedTies}
        participants={parts}
        matches={ms}
        qualify={advance}
        wildcards={wildcards}
      />
      <details>
        <summary className="cursor-pointer text-sm text-accent">{t("groupSchedule")}</summary>
        <div className="mt-3">
          <ScheduleView matches={ms} participants={parts} />
        </div>
      </details>
    </section>
  ));

  const byIdAll = new Map(participants.map((p) => [p.id, p]));
  // Candidates for the extra spots, up to the group-place tier where the last spot is decided.
  const lastTier = candidates[Math.max(0, extraSpots - 1)]?.place ?? 0;
  const race = extraSpots > 0 ? candidates.filter((r) => r.place <= lastTier) : [];
  const fmt = (x: number) => (Math.round(x * 100) / 100).toString();
  const raceTable = race.length > 0 && (
    <section className="space-y-2">
      <h3 className="text-lg font-semibold">{t("wildcardTable")}</h3>
      <p className="text-xs text-muted">{t("wildcardTableHint")}</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-3 py-2 text-left font-medium">{ts("participant")}</th>
              <th className="px-2 py-2 text-center font-medium">{ts("place")}</th>
              <th className="px-2 py-2 text-center font-medium">
                {ts("points")} / {t("perMatch")}
              </th>
              <th className="px-2 py-2 text-center font-medium">
                {ts("diff")} / {t("perMatch")}
              </th>
              <th className="hidden px-2 py-2 text-center font-medium sm:table-cell">
                {ts("against")} / {t("perMatch")}
              </th>
            </tr>
          </thead>
          <tbody>
            {race.map((r) => {
              const p = byIdAll.get(r.id);
              if (!p) return null;
              const pm = (x: number) => (r.played ? x / r.played : 0);
              const through = qualified.has(r.id);
              return (
                <tr
                  key={r.id}
                  className={`border-b border-border last:border-0 ${
                    through ? "bg-amber-500/10 shadow-[inset_3px_0_0_rgb(245_158_11)]" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    <ParticipantLabel participant={p} locale={locale} size={24} photosOnMobile={false} />
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums">
                    {r.place} ({groupLetter(r.group)})
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums">{fmt(pm(r.points))}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{fmt(pm(r.diff))}</td>
                  <td className="hidden px-2 py-2 text-center tabular-nums sm:table-cell">{fmt(pm(r.against))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  const legend = (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
      <span className="flex items-center gap-2">
        <span className="inline-block h-3 w-1 rounded bg-accent" aria-hidden /> {t("legendDirect")}
      </span>
      {(wildcards.size > 0 || race.length > 0) && (
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-1 rounded bg-amber-500" aria-hidden /> {t("legendWildcard")}
        </span>
      )}
    </div>
  );

  // Final places once the playoff has started: bracket places + those who didn't reach it.
  let places: [string, string][] = [];
  if (playoff.length) {
    const rounds = Math.max(...playoff.map((m) => m.tour));
    const fromBracket = playoffPlaces(
      playoff.map((m) => ({ round: m.tour, slot: m.slot ?? 0, home: m.home_id, away: m.away_id, winner: matchWinner(m) })),
      rounds,
    );
    places = [...fromBracket, ...groupOutPlaces(groupRows, inPlayoff)].sort(([, a], [, b]) => byPlaceLabel(a, b));
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
        {
          key: "groups",
          label: t("tabGroups"),
          content: (
            <div className="space-y-10">
              {legend}
              {groups}
              {raceTable}
            </div>
          ),
        },
        { key: "playoff", label: t("tabPlayoff"), content: playoffContent },
      ]}
    />
  );
}
