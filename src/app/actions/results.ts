"use server";

import { revalidatePath } from "next/cache";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { validateMatch, type Game } from "@/lib/scoring";
import type { Tournament } from "@/lib/tournaments";

export type ResultState = {
  error?: "forbidden" | "generic" | "count" | "game" | "empty";
  gameIndex?: number;
  saved?: number;
};

async function loadForEdit(matchId: string) {
  const staff = await getStaff();
  if (!staff) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("id, tournament_id, home_id, away_id, tournament:tournaments(status, match_format, game_target, balance, balance_cap)")
    .eq("id", matchId)
    .maybeSingle();
  if (!data) return null;
  const t = data.tournament as unknown as Pick<
    Tournament,
    "status" | "match_format" | "game_target" | "balance" | "balance_cap"
  >;
  // Results are entered while the tournament runs; only the owner may correct a finished one.
  const allowed = t.status === "active" || (t.status === "finished" && staff.role === "owner");
  return allowed ? { supabase, match: data, t } : null;
}

export async function saveResult(matchId: string, prev: ResultState, fd: FormData): Promise<ResultState> {
  const ctx = await loadForEdit(matchId);
  if (!ctx) return { error: "forbidden" };
  const { supabase, match, t } = ctx;

  let update: { games: Game[] | null; walkover_winner_id: string | null };
  const walkover = String(fd.get("walkover") ?? "");
  if (walkover === "home" || walkover === "away") {
    update = { games: null, walkover_winner_id: walkover === "home" ? match.home_id : match.away_id };
  } else {
    const games: Game[] = [];
    for (let i = 0; i < 3; i++) {
      const h = String(fd.get(`g${i}_h`) ?? "").trim();
      const a = String(fd.get(`g${i}_a`) ?? "").trim();
      if (h === "" && a === "") continue;
      games.push([Number(h), Number(a)]);
    }
    if (games.length === 0) return { error: "empty" };
    const err = validateMatch(games, t.match_format, {
      target: t.game_target,
      balance: t.balance,
      cap: t.balance_cap,
    });
    if (err) return err.code === "game" ? { error: "game", gameIndex: err.index } : { error: "count" };
    update = { games, walkover_winner_id: null };
  }

  const { error } = await supabase.from("matches").update(update).eq("id", matchId);
  if (error) return { error: "generic" };
  revalidatePath(`/[locale]/tournaments/${match.tournament_id}`, "layout");
  return { saved: (prev.saved ?? 0) + 1 };
}

export async function clearResult(matchId: string) {
  const ctx = await loadForEdit(matchId);
  if (!ctx) return;
  await ctx.supabase.from("matches").update({ games: null, walkover_winner_id: null }).eq("id", matchId);
  revalidatePath(`/[locale]/tournaments/${ctx.match.tournament_id}`, "layout");
}
