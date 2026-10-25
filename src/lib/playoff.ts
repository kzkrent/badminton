import type { MatchFormat } from "./tournaments";

/** Rules of one playoff round: always "best of three" (a draw is impossible). */
export type RoundRules = {
  match_format: Extract<MatchFormat, "best_of_three">;
  game_target: 15 | 21;
  balance: boolean;
  balance_cap: number | null;
};

export const ROUND_KEYS = ["r64", "r32", "r16", "qf", "sf", "final", "third"] as const;
export type RoundKey = (typeof ROUND_KEYS)[number];
export type PlayoffSettings = Partial<Record<RoundKey, RoundRules>>;

export const DEFAULT_ROUND_RULES: RoundRules = { match_format: "best_of_three", game_target: 21, balance: true, balance_cap: 30 };

export const nextPowerOfTwo = (n: number) => 2 ** Math.ceil(Math.log2(Math.max(2, n)));

/** Number of rounds in a bracket for `qualifiers` participants. */
export const roundsFor = (qualifiers: number) => Math.log2(nextPowerOfTwo(qualifiers));

/** Settings key of round `round` (1 = first) out of `rounds`; the 3rd-place match is "third". */
export function roundKey(round: number, rounds: number, slot = 0): RoundKey {
  if (round === rounds && slot === 1) return "third";
  return (["final", "sf", "qf", "r16", "r32", "r64"] as const)[rounds - round];
}

/** Keys of the rounds a bracket of this size uses, first round first. */
export function usedRoundKeys(qualifiers: number, thirdPlace: boolean): RoundKey[] {
  const rounds = roundsFor(qualifiers);
  const keys = Array.from({ length: rounds }, (_, i) => roundKey(i + 1, rounds));
  if (thirdPlace && rounds >= 2) keys.push("third");
  return keys;
}

export const rulesFor = (settings: PlayoffSettings | null, key: RoundKey): RoundRules =>
  settings?.[key] ?? DEFAULT_ROUND_RULES;

/** Standard seed order: 4 → [1,4,2,3]; 8 → [1,8,4,5,2,7,3,6]. Adjacent pairs meet in round 1. */
export function bracketOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}

export type Qualifier = { id: string; group: number };

/**
 * First-round pairs for seeded qualifiers (index 0 = seed 1). Missing seeds are byes (null) and always
 * face top seeds. Pairs from the same group are separated by swapping lower seeds where possible.
 */
export function firstRound(seeded: Qualifier[]): [Qualifier | null, Qualifier | null][] {
  const size = nextPowerOfTwo(seeded.length);
  const order = bracketOrder(size);
  const pairs: [Qualifier | null, Qualifier | null][] = [];
  for (let i = 0; i < size; i += 2) {
    pairs.push([seeded[order[i] - 1] ?? null, seeded[order[i + 1] - 1] ?? null]);
  }
  const clash = (p: [Qualifier | null, Qualifier | null]) => !!p[0] && !!p[1] && p[0].group === p[1].group;
  for (let i = 0; i < pairs.length; i++) {
    if (!clash(pairs[i])) continue;
    // Try lower seeds of other pairs, nearest first.
    for (let d = 1; d < pairs.length; d++) {
      const j = [i + d, i - d].find((k) => k >= 0 && k < pairs.length && pairs[k][1]);
      if (j === undefined) continue;
      const a: [Qualifier | null, Qualifier | null] = [pairs[i][0], pairs[j][1]];
      const b: [Qualifier | null, Qualifier | null] = [pairs[j][0], pairs[i][1]];
      if (!clash(a) && !clash(b)) {
        pairs[i] = a;
        pairs[j] = b;
        break;
      }
    }
  }
  return pairs;
}

export type PlayoffMatchSeed = { round: number; slot: number; home: string | null; away: string | null };

/**
 * All playoff matches. Round 1 holds real pairs only; a participant with a bye starts in round 2.
 * Later rounds start empty and are filled as results come in. The 3rd-place match is round R, slot 1.
 */
export function buildPlayoff(seeded: Qualifier[], thirdPlace: boolean): PlayoffMatchSeed[] {
  const pairs = firstRound(seeded);
  const rounds = Math.log2(pairs.length * 2);
  const matches: PlayoffMatchSeed[] = [];
  for (let r = 2; r <= rounds; r++) {
    for (let slot = 0; slot < 2 ** (rounds - r); slot++) matches.push({ round: r, slot, home: null, away: null });
  }
  pairs.forEach(([home, away], slot) => {
    if (home && away) {
      matches.push({ round: 1, slot, home: home.id, away: away.id });
      return;
    }
    const through = home ?? away;
    if (!through) return;
    const next = matches.find((m) => m.round === 2 && m.slot === Math.floor(slot / 2))!;
    if (slot % 2 === 0) next.home = through.id;
    else next.away = through.id;
  });
  if (thirdPlace && rounds >= 2) matches.push({ round: rounds, slot: 1, home: null, away: null });
  return matches.sort((a, b) => a.round - b.round || a.slot - b.slot);
}

/** Where the winner of (round, slot) goes; null after the final or from the 3rd-place match. */
export function winnerTarget(round: number, slot: number, rounds: number) {
  if (round >= rounds) return null;
  return { round: round + 1, slot: Math.floor(slot / 2), side: slot % 2 === 0 ? ("home" as const) : ("away" as const) };
}

/** Where a semifinal loser goes (3rd-place match), if there is one. */
export function loserTarget(round: number, slot: number, rounds: number, thirdPlace: boolean) {
  if (!thirdPlace || rounds < 2 || round !== rounds - 1) return null;
  return { round: rounds, slot: 1, side: slot === 0 ? ("home" as const) : ("away" as const) };
}

export type PlayedPlayoffMatch = {
  round: number;
  slot: number;
  home: string | null;
  away: string | null;
  winner: string | null;
};

/**
 * Final places from the bracket: "1", "2", "3"/"4" (or "3–4" without the 3rd-place match);
 * losers of a round with M matches share "M+1–2M". Only decided matches count.
 */
export function playoffPlaces(matches: PlayedPlayoffMatch[], rounds: number): Map<string, string> {
  const places = new Map<string, string>();
  for (const m of matches) {
    if (!m.winner || !m.home || !m.away) continue;
    const loser = m.winner === m.home ? m.away : m.home;
    if (m.round === rounds && m.slot === 0) {
      places.set(m.winner, "1");
      places.set(loser, "2");
    } else if (m.round === rounds && m.slot === 1) {
      places.set(m.winner, "3");
      places.set(loser, "4");
    } else {
      const count = 2 ** (rounds - m.round);
      if (!places.has(loser)) places.set(loser, m.round === rounds - 1 ? "3–4" : `${count + 1}–${count * 2}`);
    }
  }
  return places;
}

/** A participant's result in its group, for seeding and final places. */
export type GroupRow = { id: string; group: number; place: number; points: number; diff: number; against: number };

const byGroupPerformance = (a: GroupRow, b: GroupRow) =>
  a.place - b.place || b.points - a.points || b.diff - a.diff || a.against - b.against || a.group - b.group;

/** Seeds: all group winners first, then runners-up, …; within a tier by points, difference, conceded. */
export function seedQualifiers(rows: GroupRow[], advance: number): Qualifier[] {
  return rows
    .filter((r) => r.place <= advance)
    .sort(byGroupPerformance)
    .map((r) => ({ id: r.id, group: r.group }));
}

/** Places for those who didn't leave the groups: each group-place tier shares a range after the qualifiers. */
export function groupOutPlaces(rows: GroupRow[], advance: number): Map<string, string> {
  const out = new Map<string, string>();
  const qualifiers = rows.filter((r) => r.place <= advance).length;
  let next = qualifiers + 1;
  const tiers = [...new Set(rows.filter((r) => r.place > advance).map((r) => r.place))].sort((a, b) => a - b);
  for (const place of tiers) {
    const tier = rows.filter((r) => r.place === place);
    const label = tier.length === 1 ? String(next) : `${next}–${next + tier.length - 1}`;
    for (const r of tier) out.set(r.id, label);
    next += tier.length;
  }
  return out;
}

/** Sorts place labels like "1", "3–4", "5–8" by their first number. */
export const byPlaceLabel = (a: string, b: string) => parseInt(a, 10) - parseInt(b, 10);
