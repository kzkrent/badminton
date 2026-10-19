import { cache } from "react";
import { createClient } from "./supabase/server";
import { categoryOf, computeRatings, type RatingMatch } from "./rating";
import type { Game } from "./scoring";
import type { Discipline } from "./tournaments";

type TournamentRow = {
  id: string;
  discipline: Discipline;
  starts_on: string | null;
  created_at: string;
  rating_weight: number;
};
type ParticipantRow = { id: string; player1_id: string; player2_id: string | null };
type MatchRow = {
  id: string;
  tournament_id: string;
  tour: number;
  position: number;
  home_id: string;
  away_id: string;
  games: Game[] | null;
};

/** All ratings, recomputed from every played non-walkover match (SPEC 8). Cached per request. */
export const loadRatings = cache(async () => {
  const supabase = await createClient();
  const [{ data: ts }, { data: ps }, { data: ms }, { data: players }] = await Promise.all([
    supabase.from("tournaments").select("id, discipline, starts_on, created_at, rating_weight").neq("status", "draft"),
    supabase.from("participants").select("id, player1_id, player2_id"),
    supabase
      .from("matches")
      .select("id, tournament_id, tour, position, home_id, away_id, games")
      .not("games", "is", null)
      .is("walkover_winner_id", null),
    supabase.from("players").select("id, rating"),
  ]);

  const tournaments = new Map(((ts ?? []) as TournamentRow[]).map((t) => [t.id, t]));
  const participants = new Map(((ps ?? []) as ParticipantRow[]).map((p) => [p.id, p]));
  const side = (id: string) => {
    const p = participants.get(id);
    return p ? [p.player1_id, p.player2_id].filter((x): x is string => !!x) : [];
  };
  const when = (t: TournamentRow) => t.starts_on ?? t.created_at.slice(0, 10);

  const matches: RatingMatch[] = ((ms ?? []) as MatchRow[])
    .filter((m) => tournaments.has(m.tournament_id) && m.games?.length)
    .sort((a, b) => {
      const ta = tournaments.get(a.tournament_id)!;
      const tb = tournaments.get(b.tournament_id)!;
      return (
        when(ta).localeCompare(when(tb)) ||
        ta.created_at.localeCompare(tb.created_at) ||
        a.tour - b.tour ||
        a.position - b.position
      );
    })
    .map((m) => ({
      id: m.id,
      tournamentId: m.tournament_id,
      category: categoryOf(tournaments.get(m.tournament_id)!.discipline),
      home: side(m.home_id),
      away: side(m.away_id),
      games: m.games!,
      weight: Number(tournaments.get(m.tournament_id)!.rating_weight ?? 1),
    }))
    .filter((m) => m.home.length && m.away.length);

  const seeds = new Map(
    ((players ?? []) as { id: string; rating: number | null }[]).map((p) => [p.id, p.rating === null ? null : Number(p.rating)]),
  );
  return computeRatings(matches, seeds);
});
