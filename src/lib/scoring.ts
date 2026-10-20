import type { MatchFormat } from "./tournaments";

export type GameRules = { target: number; balance: boolean; cap: number | null };
export type Game = [number, number];

/** Is this a valid final score of one game? (SPEC 5.3) */
export function isValidGame([h, a]: Game, { target, balance, cap }: GameRules): boolean {
  if (![h, a].every((x) => Number.isInteger(x) && x >= 0) || h === a) return false;
  const w = Math.max(h, a);
  const l = Math.min(h, a);
  if (!balance) return w === target && l <= target - 1;
  const max = cap ?? Infinity;
  if (w === target) return l <= target - 2;
  if (w > target && w <= max && w - l === 2) return true;
  return w === max && l === max - 1;
}

export type MatchError = { code: "game"; index: number } | { code: "count" };

/**
 * Validates a whole match.
 * two_games — exactly 2 games (1:1 allowed); best_of_three — 2 games if 2:0, otherwise 3 with the third deciding.
 */
export function validateMatch(games: Game[], format: MatchFormat, rules: GameRules): MatchError | null {
  const bad = games.findIndex((g) => !isValidGame(g, rules));
  if (bad >= 0) return { code: "game", index: bad };

  if (format === "two_games") return games.length === 2 ? null : { code: "count" };

  const winners = games.map(([h, a]) => (h > a ? "h" : "a"));
  if (games.length === 2) return winners[0] === winners[1] ? null : { code: "count" };
  if (games.length === 3) return winners[0] !== winners[1] ? null : { code: "count" };
  return { code: "count" };
}

export type MatchLike = {
  home_id: string;
  away_id: string;
  games: Game[] | null;
  walkover_winner_id: string | null;
};

export type Outcome = {
  homeGames: number;
  awayGames: number;
  /** standings points (SPEC 6.2) */
  homePoints: number;
  awayPoints: number;
  homeShuttles: number;
  awayShuttles: number;
};

/** League points by games won: 2:0 → 3:0, 2:1 → 2:1, 1:1 → 1:1 (SPEC 6.2). */
export function matchPoints(homeGames: number, awayGames: number): [number, number] {
  if (homeGames > awayGames && awayGames === 0) return [3, 0];
  if (awayGames > homeGames && homeGames === 0) return [0, 3];
  return [homeGames, awayGames];
}

/** Result of a match for the table, or null if not played. Walkover = 2:0 in games, no shuttles counted (SPEC 5.4). */
export function outcome(m: MatchLike): Outcome | null {
  if (m.walkover_winner_id) {
    const homeWins = m.walkover_winner_id === m.home_id;
    return {
      homeGames: homeWins ? 2 : 0,
      awayGames: homeWins ? 0 : 2,
      homePoints: homeWins ? 3 : 0,
      awayPoints: homeWins ? 0 : 3,
      homeShuttles: 0,
      awayShuttles: 0,
    };
  }
  if (!m.games?.length) return null;
  const o: Outcome = { homeGames: 0, awayGames: 0, homePoints: 0, awayPoints: 0, homeShuttles: 0, awayShuttles: 0 };
  for (const [h, a] of m.games) {
    o.homeShuttles += h;
    o.awayShuttles += a;
    if (h > a) o.homeGames++;
    else o.awayGames++;
  }
  [o.homePoints, o.awayPoints] = matchPoints(o.homeGames, o.awayGames);
  return o;
}

/** Display score, e.g. "21:15, 18:21, 21:19"; a walkover shows as the match score 2:0. */
export function displayGames(m: MatchLike): Game[] | null {
  if (m.walkover_winner_id) return [m.walkover_winner_id === m.home_id ? [2, 0] : [0, 2]];
  return m.games?.length ? m.games : null;
}
