import { outcome, type MatchLike } from "./scoring";

export type PlayerRecord = {
  played: number;
  wins: number;
  losses: number;
  /** two-games format 1:1 */
  draws: number;
  gamesWon: number;
  gamesLost: number;
};

export const emptyRecord = (): PlayerRecord => ({ played: 0, wins: 0, losses: 0, draws: 0, gamesWon: 0, gamesLost: 0 });

/** Adds a participant's played matches to a running record. */
export function addMatches(rec: PlayerRecord, participantId: string, matches: MatchLike[]): PlayerRecord {
  for (const m of matches) {
    const isHome = m.home_id === participantId;
    if (!isHome && m.away_id !== participantId) continue;
    const o = outcome(m);
    if (!o) continue;
    const own = isHome ? o.homeGames : o.awayGames;
    const opp = isHome ? o.awayGames : o.homeGames;
    rec.played++;
    rec.gamesWon += own;
    rec.gamesLost += opp;
    if (own > opp) rec.wins++;
    else if (own < opp) rec.losses++;
    else rec.draws++;
  }
  return rec;
}
