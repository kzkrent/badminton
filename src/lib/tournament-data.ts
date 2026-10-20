import { createClient } from "./supabase/server";
import { addMatches, emptyRecord, type PlayerRecord } from "./player-stats";
import { computeStandings } from "./standings";
import {
  MATCH_COLUMNS,
  PARTICIPANT_COLUMNS,
  TOURNAMENT_COLUMNS,
  type Match,
  type Participant,
  type Tournament,
} from "./tournaments";

/** Tournament with participants and schedule, or null if missing / not visible. */
export async function loadTournament(id: string) {
  const supabase = await createClient();
  const { data: tournament } = await supabase.from("tournaments").select(TOURNAMENT_COLUMNS).eq("id", id).maybeSingle();
  if (!tournament) return null;

  const [{ data: participants }, { data: matches }] = await Promise.all([
    supabase.from("participants").select(PARTICIPANT_COLUMNS).eq("tournament_id", id).order("created_at"),
    supabase.from("matches").select(MATCH_COLUMNS).eq("tournament_id", id).order("tour").order("position"),
  ]);

  return {
    tournament: tournament as Tournament,
    participants: (participants ?? []) as unknown as Participant[],
    matches: (matches ?? []) as Match[],
  };
}

export type PlayerTournament = {
  tournament: Tournament;
  participant: Participant;
  place: string | null;
  participantsCount: number;
  record: PlayerRecord;
};

/** Every non-draft tournament the player took part in, newest first, with place and match record. */
export async function loadPlayerHistory(playerId: string) {
  const supabase = await createClient();
  const { data: own } = await supabase
    .from("participants")
    .select(PARTICIPANT_COLUMNS)
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`);
  const mine = (own ?? []) as unknown as Participant[];
  const tournamentIds = [...new Set(mine.map((p) => p.tournament_id))];
  if (tournamentIds.length === 0) return { history: [] as PlayerTournament[], total: emptyRecord() };

  const [{ data: ts }, { data: ms }, { data: ps }] = await Promise.all([
    supabase.from("tournaments").select(TOURNAMENT_COLUMNS).in("id", tournamentIds).in("status", ["active", "finished"]),
    supabase.from("matches").select(`tournament_id, ${MATCH_COLUMNS}`).in("tournament_id", tournamentIds),
    supabase.from("participants").select("id, tournament_id").in("tournament_id", tournamentIds),
  ]);
  const matches = (ms ?? []) as (Match & { tournament_id: string })[];
  const allParticipants = (ps ?? []) as { id: string; tournament_id: string }[];

  const total = emptyRecord();
  const history: PlayerTournament[] = ((ts ?? []) as Tournament[]).map((tournament) => {
    const participant = mine.find((p) => p.tournament_id === tournament.id)!;
    const tMatches = matches.filter((m) => m.tournament_id === tournament.id);
    const ids = allParticipants.filter((p) => p.tournament_id === tournament.id).map((p) => p.id);
    const standings = computeStandings(ids, tMatches, tournament.game_target);
    const record = addMatches(emptyRecord(), participant.id, tMatches, tournament.game_target);
    addMatches(total, participant.id, tMatches, tournament.game_target);
    return {
      tournament,
      participant,
      place: standings.rows.find((r) => r.id === participant.id)?.place ?? null,
      participantsCount: ids.length,
      record,
    };
  });
  history.sort((a, b) => (b.tournament.starts_on ?? "").localeCompare(a.tournament.starts_on ?? ""));
  return { history, total };
}
