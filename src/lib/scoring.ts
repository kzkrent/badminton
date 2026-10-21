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

/** Most games a match of this format can have. */
export const maxGames = (format: MatchFormat) => (format === "best_of_three" ? 3 : 2);

/**
 * Validates a whole match.
 * two_games — exactly 2 games (1:1 allowed); best_of_three — the match ends as soon as one side has
 * won 2 games, with no extra game after that.
 */
export function validateMatch(games: Game[], format: MatchFormat, rules: GameRules): MatchError | null {
  const bad = games.findIndex((g) => !isValidGame(g, rules));
  if (bad >= 0) return { code: "game", index: bad };

  if (format === "two_games") return games.length === 2 ? null : { code: "count" };

  const need = 2;
  let h = 0;
  let a = 0;
  for (const [gh, ga] of games) {
    if (h === need || a === need) return { code: "count" }; // game after the match was decided
    if (gh > ga) h++;
    else a++;
  }
  return h === need || a === need ? null : { code: "count" };
}

export type MatchLike = {
  home_id: string | null;
  away_id: string | null;
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

/** League points (SPEC 6.2): a win without dropping a game 3:0, any other win 2:1, a 1:1 draw 1:1. */
export function matchPoints(homeGames: number, awayGames: number): [number, number] {
  if (homeGames === awayGames) return [homeGames, awayGames];
  const homeWins = homeGames > awayGames;
  const loserGames = homeWins ? awayGames : homeGames;
  const [w, l] = loserGames === 0 ? [3, 0] : [2, 1];
  return homeWins ? [w, l] : [l, w];
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

/** Winner of a decided match (games or walkover), or null. */
export function matchWinner(m: MatchLike): string | null {
  if (m.walkover_winner_id) return m.walkover_winner_id;
  const o = outcome(m);
  if (!o || o.homeGames === o.awayGames) return null;
  return o.homeGames > o.awayGames ? m.home_id : m.away_id;
}
