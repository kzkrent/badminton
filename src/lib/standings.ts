import { outcome, type MatchLike } from "./scoring";

export type StandingRow = {
  id: string;
  played: number;
  shuttlesFor: number;
  shuttlesAgainst: number;
  diff: number;
  points: number;
  /** "3", or "5/6" when the tie couldn't be broken; null before any match is played */
  place: string | null;
  /** 0-based sort position */
  order: number;
};

export type Standings = {
  rows: StandingRow[];
  /** Groups of ids that remained fully tied after all tiebreakers. */
  unresolvedTies: string[][];
};

type Totals = Omit<StandingRow, "place" | "order">;

function totals(ids: string[], matches: MatchLike[], target: number): Map<string, Totals> {
  const t = new Map<string, Totals>(
    ids.map((id) => [id, { id, played: 0, shuttlesFor: 0, shuttlesAgainst: 0, diff: 0, points: 0 }]),
  );
  for (const m of matches) {
    const o = outcome(m, target);
    const home = t.get(m.home_id);
    const away = t.get(m.away_id);
    if (!o || !home || !away) continue;
    home.played++;
    away.played++;
    home.points += o.homeGames;
    away.points += o.awayGames;
    home.shuttlesFor += o.homeShuttles;
    home.shuttlesAgainst += o.awayShuttles;
    away.shuttlesFor += o.awayShuttles;
    away.shuttlesAgainst += o.homeShuttles;
  }
  for (const r of t.values()) r.diff = r.shuttlesFor - r.shuttlesAgainst;
  return t;
}

/** Splits an ordered list into runs of equal key. */
function groupBy<T>(items: T[], key: (x: T) => number): T[][] {
  const groups: T[][] = [];
  for (const x of items) {
    const last = groups[groups.length - 1];
    if (last && key(last[0]) === key(x)) last.push(x);
    else groups.push([x]);
  }
  return groups;
}

/**
 * League standings (SPEC 6.2–6.3):
 * points → head-to-head mini-table (re-applied to every still-tied subgroup)
 * → overall shuttle difference → fewer shuttles conceded → shared place.
 */
export function computeStandings(ids: string[], matches: MatchLike[], target: number): Standings {
  const all = totals(ids, matches, target);
  const anyPlayed = [...all.values()].some((r) => r.played > 0);
  const unresolvedTies: string[][] = [];

  // Returns the group in final order, as tiers of ids that stay tied.
  const resolve = (group: string[]): string[][] => {
    if (group.length === 1) return [group];

    const set = new Set(group);
    const mini = totals(
      group,
      matches.filter((m) => set.has(m.home_id) && set.has(m.away_id)),
      target,
    );
    const byMini = groupBy(
      [...group].sort((a, b) => mini.get(b)!.points - mini.get(a)!.points),
      (id) => mini.get(id)!.points,
    );
    if (byMini.length > 1) return byMini.flatMap(resolve);

    // Head-to-head didn't separate anyone: overall difference, then fewer conceded.
    const sorted = [...group].sort(
      (a, b) => all.get(b)!.diff - all.get(a)!.diff || all.get(a)!.shuttlesAgainst - all.get(b)!.shuttlesAgainst,
    );
    const tiers: string[][] = [];
    for (const id of sorted) {
      const last = tiers[tiers.length - 1];
      const r = all.get(id)!;
      const prev = last && all.get(last[0])!;
      if (prev && prev.diff === r.diff && prev.shuttlesAgainst === r.shuttlesAgainst) last.push(id);
      else tiers.push([id]);
    }
    return tiers;
  };

  const byPoints = groupBy(
    [...ids].sort((a, b) => all.get(b)!.points - all.get(a)!.points),
    (id) => all.get(id)!.points,
  );
  const tiers = anyPlayed ? byPoints.flatMap(resolve) : [ids];

  const rows: StandingRow[] = [];
  let position = 1;
  for (const tier of tiers) {
    const place = !anyPlayed
      ? null
      : tier.length === 1
        ? String(position)
        : tier.map((_, i) => position + i).join("/");
    if (anyPlayed && tier.length > 1) unresolvedTies.push(tier);
    for (const id of tier) rows.push({ ...all.get(id)!, place, order: rows.length });
    position += tier.length;
  }
  return { rows, unresolvedTies };
}
