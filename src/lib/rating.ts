import type { Game } from "./scoring";
import type { Discipline } from "./tournaments";

export type RatingCategory = "singles" | "doubles" | "mixed";
export const RATING_CATEGORIES: RatingCategory[] = ["singles", "doubles", "mixed"];

export const START_RATING = 1500;
export const PROVISIONAL_MATCHES = 10;
export const K_PROVISIONAL = 40;
export const K_REGULAR = 20;
/** Minimum matches in a category to appear on the ratings page. */
export const MIN_RANKED_MATCHES = 5;

export function categoryOf(d: Discipline): RatingCategory {
  return d === "MF" ? "mixed" : d.length === 2 ? "doubles" : "singles";
}

/** A played (non-walkover) match in chronological order; sides are player ids. */
export type RatingMatch = {
  id: string;
  tournamentId: string;
  category: RatingCategory;
  home: string[];
  away: string[];
  games: Game[];
};

export type RatingPoint = { matchId: string; tournamentId: string; before: number; after: number };
export type PlayerRating = { rating: number; matches: number; history: RatingPoint[] };
export type Ratings = Record<RatingCategory, Map<string, PlayerRating>>;

export function expected(own: number, opp: number) {
  return 1 / (1 + 10 ** ((opp - own) / 400));
}

/** Actual score with margin by games: 2:0 → 1, 2:1 → 0.75, 1:1 → 0.5 (SPEC 8). */
export function actualScore(ownGames: number, oppGames: number) {
  if (ownGames === oppGames) return 0.5;
  const win = ownGames > oppGames;
  const dominant = Math.min(ownGames, oppGames) === 0;
  const s = dominant ? 1 : 0.75;
  return win ? s : 1 - s;
}

/** Elo ratings computed from scratch over chronologically ordered matches. */
export function computeRatings(matches: RatingMatch[], seeds: Map<string, number | null> = new Map()): Ratings {
  const ratings: Ratings = { singles: new Map(), doubles: new Map(), mixed: new Map() };

  const get = (cat: RatingCategory, id: string) => {
    let r = ratings[cat].get(id);
    if (!r) {
      r = { rating: seeds.get(id) ?? START_RATING, matches: 0, history: [] };
      ratings[cat].set(id, r);
    }
    return r;
  };

  for (const m of matches) {
    const home = m.home.map((id) => get(m.category, id));
    const away = m.away.map((id) => get(m.category, id));
    const avg = (side: PlayerRating[]) => side.reduce((s, r) => s + r.rating, 0) / side.length;
    const homeAvg = avg(home);
    const awayAvg = avg(away);

    let hg = 0;
    let ag = 0;
    for (const [h, a] of m.games) {
      if (h > a) hg++;
      else ag++;
    }
    const sHome = actualScore(hg, ag);
    const eHome = expected(homeAvg, awayAvg);

    // Compute both sides from pre-match ratings before applying any change.
    const updates: [PlayerRating, number][] = [
      ...home.map((r) => [r, sHome - eHome] as [PlayerRating, number]),
      ...away.map((r) => [r, 1 - sHome - (1 - eHome)] as [PlayerRating, number]),
    ];
    for (const [r, delta] of updates) {
      const k = r.matches < PROVISIONAL_MATCHES ? K_PROVISIONAL : K_REGULAR;
      const before = r.rating;
      r.rating = before + k * delta;
      r.matches++;
      r.history.push({ matchId: m.id, tournamentId: m.tournamentId, before, after: r.rating });
    }
  }
  return ratings;
}

/** Change over the player's most recent tournament in this category. */
export function lastTournamentChange(r: PlayerRating): number | null {
  if (r.history.length === 0) return null;
  const lastT = r.history[r.history.length - 1].tournamentId;
  const first = r.history.find((h) => h.tournamentId === lastT)!;
  return r.rating - first.before;
}
