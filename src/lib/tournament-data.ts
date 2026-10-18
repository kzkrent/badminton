import { createClient } from "./supabase/server";
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
