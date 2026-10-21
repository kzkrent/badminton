"use server";

import { revalidatePath } from "next/cache";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { matchWinner, maxGames, validateMatch, type Game } from "@/lib/scoring";
import { loserTarget, roundKey, rulesFor, winnerTarget, type PlayoffSettings } from "@/lib/playoff";
import type { MatchFormat, Tournament } from "@/lib/tournaments";

export type ResultState = {
  error?: "forbidden" | "generic" | "count" | "game" | "empty" | "notReady" | "nextPlayed";
  gameIndex?: number;
  saved?: number;
};

type Rules = { match_format: MatchFormat; game_target: number; balance: boolean; balance_cap: number | null };

type EditMatch = {
  id: string;
  tournament_id: string;
  home_id: string | null;
  away_id: string | null;
  stage: "group" | "playoff";
  tour: number;
  slot: number | null;
  games: Game[] | null;
  walkover_winner_id: string | null;
};

async function loadForEdit(matchId: string) {
  const staff = await getStaff();
  if (!staff) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select(
      "id, tournament_id, home_id, away_id, stage, tour, slot, games, walkover_winner_id, tournament:tournaments(status, match_format, game_target, balance, balance_cap, playoff_settings, third_place)",
    )
    .eq("id", matchId)
    .maybeSingle();
  if (!data) return null;
  const t = data.tournament as unknown as Pick<
    Tournament,
    "status" | "match_format" | "game_target" | "balance" | "balance_cap" | "playoff_settings" | "third_place"
  >;
  // Results are entered while the tournament runs; only the owner may correct a finished one.
  const allowed = t.status === "active" || (t.status === "finished" && staff.role === "owner");
  if (!allowed) return null;
  const match = data as unknown as EditMatch;

  let rules: Rules = t;
  let rounds = 0;
  if (match.stage === "playoff") {
    const { data: last } = await supabase
      .from("matches")
      .select("tour")
      .eq("tournament_id", match.tournament_id)
      .eq("stage", "playoff")
      .order("tour", { ascending: false })
      .limit(1)
      .maybeSingle();
    rounds = last?.tour ?? match.tour;
    rules = rulesFor(t.playoff_settings as PlayoffSettings | null, roundKey(match.tour, rounds, match.slot ?? 0));
  }
  return { supabase, match, t, rules, rounds };
}

type Ctx = NonNullable<Awaited<ReturnType<typeof loadForEdit>>>;

/** Next playoff matches fed by this one (winner → next round, semifinal loser → 3rd-place match). */
async function feeds(ctx: Ctx) {
  const { supabase, match, t, rounds } = ctx;
  if (match.stage !== "playoff" || match.slot === null) return [];
  const targets = [
    { kind: "winner" as const, at: winnerTarget(match.tour, match.slot, rounds) },
    { kind: "loser" as const, at: loserTarget(match.tour, match.slot, rounds, t.third_place) },
  ].filter((x) => x.at);
  const out = [];
  for (const { kind, at } of targets) {
    const { data } = await supabase
      .from("matches")
      .select("id, home_id, away_id, games, walkover_winner_id")
      .eq("tournament_id", match.tournament_id)
      .eq("stage", "playoff")
      .eq("tour", at!.round)
      .eq("slot", at!.slot)
      .maybeSingle();
    if (data) out.push({ kind, side: at!.side, next: data as Omit<EditMatch, "stage" | "tour" | "slot" | "tournament_id"> });
  }
  return out;
}

const decided = (m: { games: Game[] | null; walkover_winner_id: string | null }) =>
  !!m.games?.length || !!m.walkover_winner_id;

/** Puts winner / loser into the next matches; refuses if a next match already has a result. */
async function propagate(ctx: Ctx, winner: string | null): Promise<ResultState | null> {
  const { supabase, match } = ctx;
  const loser = winner ? (winner === match.home_id ? match.away_id : match.home_id) : null;
  const links = await feeds(ctx);
  for (const { kind, side, next } of links) {
    const value = kind === "winner" ? winner : loser;
    const column = side === "home" ? "home_id" : "away_id";
    if (next[column] === value) continue;
    if (decided(next)) return { error: "nextPlayed" };
  }
  for (const { kind, side, next } of links) {
    const value = kind === "winner" ? winner : loser;
    const column = side === "home" ? "home_id" : "away_id";
    if (next[column] === value) continue;
    const { error } = await supabase.from("matches").update({ [column]: value }).eq("id", next.id);
    if (error) return { error: "generic" };
  }
  return null;
}

export async function saveResult(matchId: string, prev: ResultState, fd: FormData): Promise<ResultState> {
  const ctx = await loadForEdit(matchId);
  if (!ctx) return { error: "forbidden" };
  const { supabase, match, rules } = ctx;
  if (!match.home_id || !match.away_id) return { error: "notReady" };

  let update: { games: Game[] | null; walkover_winner_id: string | null };
  const walkover = String(fd.get("walkover") ?? "");
  if (walkover === "home" || walkover === "away") {
    update = { games: null, walkover_winner_id: walkover === "home" ? match.home_id : match.away_id };
  } else {
    const games: Game[] = [];
    for (let i = 0; i < maxGames(rules.match_format); i++) {
      const h = String(fd.get(`g${i}_h`) ?? "").trim();
      const a = String(fd.get(`g${i}_a`) ?? "").trim();
      if (h === "" && a === "") continue;
      games.push([Number(h), Number(a)]);
    }
    if (games.length === 0) return { error: "empty" };
    const err = validateMatch(games, rules.match_format, {
      target: rules.game_target,
      balance: rules.balance,
      cap: rules.balance_cap,
    });
    if (err) return err.code === "game" ? { error: "game", gameIndex: err.index } : { error: "count" };
    update = { games, walkover_winner_id: null };
  }

  if (match.stage === "playoff") {
    const blocked = await propagate(ctx, matchWinner({ ...match, ...update }));
    if (blocked) return blocked;
  }
  const { error } = await supabase.from("matches").update(update).eq("id", matchId);
  if (error) return { error: "generic" };
  revalidatePath("/[locale]", "layout"); // home shows recent results
  return { saved: (prev.saved ?? 0) + 1 };
}

export async function clearResult(matchId: string): Promise<ResultState> {
  const ctx = await loadForEdit(matchId);
  if (!ctx) return { error: "forbidden" };
  if (ctx.match.stage === "playoff") {
    const blocked = await propagate(ctx, null);
    if (blocked) return blocked;
  }
  await ctx.supabase.from("matches").update({ games: null, walkover_winner_id: null }).eq("id", matchId);
  revalidatePath("/[locale]", "layout"); // home shows recent results
  return {};
}
