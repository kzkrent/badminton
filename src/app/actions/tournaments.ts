"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { roundRobin } from "@/lib/schedule";
import { buildPlayoff, ROUND_KEYS, seedQualifiers, type GroupRow, type PlayoffSettings } from "@/lib/playoff";
import { shuffle, snakeGroups, validateGroups, type GroupSetupError } from "@/lib/groups";
import { computeStandings } from "@/lib/standings";
import { pairCategory, START_RATING } from "@/lib/rating";
import { loadRatings } from "@/lib/rating-data";
import type { MatchLike } from "@/lib/scoring";
import { GALLERY_BUCKET } from "@/lib/supabase/env";
import {
  DISCIPLINES,
  isDoubles,
  isPreStart,
  validateLineup,
  type Discipline,
  type LineupError,
  type Tournament,
} from "@/lib/tournaments";

export type TournamentFormState = {
  error?: "forbidden" | "generic" | "nameRequired" | "balanceCap" | "weight" | "endsBeforeStart";
};
export type ParticipantFormState = {
  error?: "forbidden" | "generic" | "notDraft" | "alreadyIn" | LineupError;
  ok?: number;
};
export type StatusActionState = {
  error?: "forbidden" | "generic" | "tooFew" | "hasResults" | "groupsSetup" | "groupsNotFinished" | "playoffHasResults";
  groupError?: GroupSetupError;
};

const text = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
};

function revalidate(id?: string) {
  // Home, the tournaments list and player pages all show tournament data.
  revalidatePath("/[locale]", "layout");
  if (id) revalidatePath(`/[locale]/tournaments/${id}`, "layout");
}

async function loadTournament(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("tournaments").select("id, status, discipline").eq("id", id).maybeSingle();
  return { supabase, tournament: data as Pick<Tournament, "id" | "status" | "discipline"> | null };
}

// ───────────── Settings ─────────────

export async function saveTournament(
  id: string | null,
  _prev: TournamentFormState,
  fd: FormData,
): Promise<TournamentFormState> {
  const staff = await getStaff();
  if (!staff) return { error: "forbidden" };

  const name_ru = text(fd, "name_ru");
  if (!name_ru) return { error: "nameRequired" };
  const startsOn = text(fd, "starts_on");
  const endsOn = text(fd, "ends_on");
  if (startsOn && endsOn && endsOn < startsOn) return { error: "endsBeforeStart" };
  const startTime = text(fd, "start_time");
  const common: Record<string, unknown> = {
    name_ru,
    name_en: text(fd, "name_en"),
    starts_on: text(fd, "starts_on"),
    ends_on: text(fd, "ends_on"),
    // Announcement details stay editable at any status.
    venue_ru: text(fd, "venue_ru"),
    venue_en: text(fd, "venue_en"),
    start_time: startTime && /^d{2}:d{2}/.test(startTime) ? startTime : null,
    announcement_ru: text(fd, "announcement_ru"),
    announcement_en: text(fd, "announcement_en"),
    registration_contact: text(fd, "registration_contact"),
    organizer_id: /^[0-9a-f-]{36}$/i.test(String(fd.get("organizer_id") ?? "")) ? String(fd.get("organizer_id")) : null,
  };

  // Rating weight is the owner's call (SPEC 8); admins' forms don't send it.
  if (staff.role === "owner" && fd.has("rating_weight")) {
    const weight = Number(String(fd.get("rating_weight")).replace(",", "."));
    if (!(weight >= 0 && weight <= 3 && Number.isInteger(weight * 4))) return { error: "weight" };
    common.rating_weight = weight;
  }

  const discipline = String(fd.get("discipline")) as Discipline;
  const game_target = fd.get("game_target") === "15" ? 15 : 21;
  const balance = fd.get("balance") === "on";
  const cap = Number(text(fd, "balance_cap") ?? (game_target === 21 ? 30 : 21));
  if (balance && !(Number.isInteger(cap) && cap > game_target + 1 && cap <= 99)) return { error: "balanceCap" };

  const format = String(fd.get("match_format"));
  const isGroups = fd.get("type") === "groups_playoff";
  const clamp = (v: unknown, lo: number, hi: number, dflt: number) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= lo && n <= hi ? n : dflt;
  };
  const seeding = String(fd.get("group_seeding"));
  const settings: Record<string, unknown> = {
    type: isGroups ? "groups_playoff" : "league",
    discipline: DISCIPLINES.includes(discipline) ? discipline : "M",
    rounds: fd.get("rounds") === "2" ? 2 : 1,
    match_format: format === "two_games" ? "two_games" : "best_of_three",
    game_target,
    balance,
    balance_cap: balance ? cap : null,
    groups_count: isGroups ? clamp(fd.get("groups_count"), 2, 8, 2) : null,
    advance_per_group: isGroups ? clamp(fd.get("advance_per_group"), 1, 8, 2) : null,
    group_seeding: isGroups ? (["rating", "random", "manual"].includes(seeding) ? seeding : "rating") : null,
  };

  // Per-round playoff rules (SPEC 5.6), sent only by the groups_playoff form.
  let playoff: Record<string, unknown> | null = null;
  if (isGroups && fd.has("po_final_target")) {
    const rules: PlayoffSettings = {};
    for (const key of ROUND_KEYS) {
      if (!fd.has(`po_${key}_target`)) continue;
      const target = fd.get(`po_${key}_target`) === "15" ? 15 : 21;
      const bal = fd.get(`po_${key}_balance`) === "on";
      const roundCap = Number(fd.get(`po_${key}_cap`));
      if (bal && !(Number.isInteger(roundCap) && roundCap > target + 1 && roundCap <= 99)) return { error: "balanceCap" };
      rules[key] = {
        match_format: "best_of_three",
        game_target: target,
        balance: bal,
        balance_cap: bal ? roundCap : null,
      };
    }
    playoff = {
      playoff_settings: rules,
      third_place: fd.get("third_place") === "on",
      fill_bracket: fd.get("fill_bracket") === "fill",
    };
  }

  const supabase = await createClient();
  if (!id) {
    const { data, error } = await supabase
      .from("tournaments")
      .insert({ ...common, ...settings, ...(playoff ?? {}) })
      .select("id")
      .single();
    if (error) return { error: "generic" };
    revalidate();
    redirect({ href: `/tournaments/${data.id}/manage`, locale: await getLocale() });
    return {};
  }

  const { tournament } = await loadTournament(id);
  if (!tournament) return { error: "forbidden" };
  // Format settings are locked once the schedule exists; names and date stay editable.
  let patch: Record<string, unknown> = common;
  if (isPreStart(tournament.status)) {
    patch = { ...common, ...settings };
    // Changing the discipline would invalidate already added participants.
    const { count } = await supabase
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", id);
    if (count) patch.discipline = tournament.discipline;
  }
  // Playoff rules stay editable until the bracket is built.
  if (playoff && tournament.status !== "finished") {
    const { count: built } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", id)
      .eq("stage", "playoff");
    if (!built) patch = { ...patch, ...playoff };
  }
  const { error } = await supabase.from("tournaments").update(patch).eq("id", id);
  if (error) return { error: "generic" };
  revalidate(id);
  redirect({ href: `/tournaments/${id}/manage`, locale: await getLocale() });
  return {};
}

// ───────────── Participants ─────────────

export async function addParticipant(
  tournamentId: string,
  prev: ParticipantFormState,
  fd: FormData,
): Promise<ParticipantFormState> {
  if (!(await getStaff())) return { error: "forbidden" };
  const { supabase, tournament } = await loadTournament(tournamentId);
  if (!tournament) return { error: "forbidden" };
  if (!isPreStart(tournament.status)) return { error: "notDraft" };

  const ids = [text(fd, "player1_id"), text(fd, "player2_id")].filter((v): v is string => !!v);
  const { data: players } = await supabase.from("players").select("id, gender").in("id", ids);
  const lineup = ids.map((pid) => players?.find((p) => p.id === pid)).filter((p) => !!p);
  if (lineup.length !== ids.length) return { error: "generic" };
  const lineupError = validateLineup(tournament.discipline, lineup);
  if (lineupError) return { error: lineupError };

  const { data: taken } = await supabase
    .from("participants")
    .select("id")
    .eq("tournament_id", tournamentId)
    .or(ids.flatMap((pid) => [`player1_id.eq.${pid}`, `player2_id.eq.${pid}`]).join(","));
  if (taken?.length) return { error: "alreadyIn" };

  const { error } = await supabase.from("participants").insert({
    tournament_id: tournamentId,
    player1_id: ids[0],
    player2_id: ids[1] ?? null,
    team_name: isDoubles(tournament.discipline) ? text(fd, "team_name") : null,
    team_name_en: isDoubles(tournament.discipline) ? text(fd, "team_name_en") : null,
  });
  if (error) return { error: "generic" };
  revalidate(tournamentId);
  return { ok: (prev.ok ?? 0) + 1 };
}

/** Team names can be fixed at any status the user may still edit (RLS: can_edit_tournament). */
export async function updateTeamNames(
  tournamentId: string,
  participantId: string,
  _prev: ParticipantFormState,
  fd: FormData,
): Promise<ParticipantFormState> {
  if (!(await getStaff())) return { error: "forbidden" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("participants")
    .update({ team_name: text(fd, "team_name"), team_name_en: text(fd, "team_name_en") })
    .eq("id", participantId)
    .eq("tournament_id", tournamentId)
    .select("id");
  if (error) return { error: "generic" };
  if (!data?.length) return { error: "forbidden" };
  revalidate(tournamentId);
  return { ok: 1 };
}

export async function removeParticipant(tournamentId: string, participantId: string) {
  if (!(await getStaff())) return;
  const { supabase, tournament } = await loadTournament(tournamentId);
  if (!tournament || !isPreStart(tournament.status)) return;
  await supabase.from("participants").delete().eq("id", participantId).eq("tournament_id", tournamentId);
  revalidate(tournamentId);
}

// ───────────── Status ─────────────

/** Average rating of a participant's players in the tournament's rating category (SPEC 5.6). */
async function participantStrength(
  parts: { id: string; player1_id: string; player2_id: string | null }[],
  discipline: Discipline,
) {
  const supabase = await createClient();
  const ratings = await loadRatings();
  const playerIds = parts.flatMap((p) => [p.player1_id, p.player2_id]).filter((x): x is string => !!x);
  const { data: players } = await supabase.from("players").select("id, rating, gender").in("id", playerIds);
  const rows = (players ?? []) as { id: string; rating: number | null; gender: "M" | "F" }[];
  const seed = new Map(rows.map((p) => [p.id, p.rating]));
  const genderOf = new Map(rows.map((p) => [p.id, p.gender]));
  const of = (pid: string, cat: ReturnType<typeof pairCategory>) => {
    const elo = ratings[cat].get(pid)?.rating;
    if (elo !== undefined) return elo;
    const start = seed.get(pid);
    return start != null ? Number(start) : START_RATING;
  };
  return new Map(
    parts.map((p) => {
      const ids = [p.player1_id, p.player2_id].filter((x): x is string => !!x);
      const cat = pairCategory(discipline, ids.map((pid) => genderOf.get(pid) ?? "M"));
      return [p.id, ids.reduce((sum, pid) => sum + of(pid, cat), 0) / ids.length] as const;
    }),
  );
}

/** draft/announced → active: league — one round robin; groups — distribute, then a round robin per group. */
export async function startTournament(id: string): Promise<StatusActionState> {
  if (!(await getStaff())) return { error: "forbidden" };
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("tournaments")
    .select("status, rounds, type, discipline, groups_count, advance_per_group, group_seeding")
    .eq("id", id)
    .maybeSingle();
  if (!t || !isPreStart(t.status)) return { error: "forbidden" };

  const { data: parts } = await supabase
    .from("participants")
    .select("id, player1_id, player2_id, group_no")
    .eq("tournament_id", id)
    .order("created_at");
  const participants = (parts ?? []) as {
    id: string;
    player1_id: string;
    player2_id: string | null;
    group_no: number | null;
  }[];
  if (participants.length < 2) return { error: "tooFew" };

  type Row = {
    tournament_id: string;
    tour: number;
    position: number;
    home_id: string;
    away_id: string;
    stage: "group";
    group_no: number | null;
  };
  const rows: Row[] = [];

  if (t.type === "groups_playoff") {
    const groups = t.groups_count as number;
    let assignment: Map<string, number | null>;
    if (t.group_seeding === "manual") {
      assignment = new Map(participants.map((p) => [p.id, p.group_no]));
    } else {
      let ordered: string[];
      if (t.group_seeding === "random") {
        ordered = shuffle(participants.map((p) => p.id));
      } else {
        const strength = await participantStrength(participants, t.discipline as Discipline);
        ordered = participants.map((p) => p.id).sort((a, b) => strength.get(b)! - strength.get(a)!);
      }
      assignment = snakeGroups(ordered, groups);
    }
    const setupError = validateGroups(assignment, groups, t.advance_per_group as number);
    if (setupError) return { error: "groupsSetup", groupError: setupError };

    if (t.group_seeding !== "manual") {
      for (const [pid, g] of assignment) {
        const { error } = await supabase.from("participants").update({ group_no: g }).eq("id", pid);
        if (error) return { error: "generic" };
      }
    }
    for (let g = 1; g <= groups; g++) {
      const ids = shuffle([...assignment].filter(([, n]) => n === g).map(([pid]) => pid));
      for (const f of roundRobin(ids, t.rounds as 1 | 2)) {
        rows.push({ tournament_id: id, tour: f.tour, position: f.position, home_id: f.home, away_id: f.away, stage: "group", group_no: g });
      }
    }
  } else {
    // Random draw so the order of adding participants doesn't decide the schedule.
    const ids = shuffle(participants.map((p) => p.id));
    for (const f of roundRobin(ids, t.rounds as 1 | 2)) {
      rows.push({ tournament_id: id, tour: f.tour, position: f.position, home_id: f.home, away_id: f.away, stage: "group", group_no: null });
    }
  }

  await supabase.from("matches").delete().eq("tournament_id", id);
  const { error } = await supabase.from("matches").insert(rows);
  if (error) return { error: "generic" };

  const { error: statusError } = await supabase.from("tournaments").update({ status: "active" }).eq("id", id);
  if (statusError) {
    await supabase.from("matches").delete().eq("tournament_id", id);
    return { error: "generic" };
  }
  revalidate(id);
  return {};
}

/** Manual distribution: put a participant into a group (before the start). */
export async function setParticipantGroup(tournamentId: string, participantId: string, group: number | null) {
  if (!(await getStaff())) return;
  const { supabase, tournament } = await loadTournament(tournamentId);
  if (!tournament || !isPreStart(tournament.status)) return;
  await supabase
    .from("participants")
    .update({ group_no: group && group >= 1 && group <= 8 ? group : null })
    .eq("id", participantId)
    .eq("tournament_id", tournamentId);
  revalidate(tournamentId);
}

/**
 * Builds (or rebuilds) the playoff from the group standings (SPEC 5.6).
 * Needs every group match decided and no playoff results yet.
 */
export async function buildPlayoffStage(id: string): Promise<StatusActionState> {
  if (!(await getStaff())) return { error: "forbidden" };
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("tournaments")
    .select("status, type, advance_per_group, third_place, fill_bracket")
    .eq("id", id)
    .maybeSingle();
  if (!t || t.status !== "active" || t.type !== "groups_playoff") return { error: "forbidden" };

  const [{ data: ms }, { data: ps }] = await Promise.all([
    supabase.from("matches").select("id, stage, group_no, home_id, away_id, games, walkover_winner_id").eq("tournament_id", id),
    supabase.from("participants").select("id, group_no").eq("tournament_id", id),
  ]);
  const matches = (ms ?? []) as (MatchLike & { id: string; stage: string; group_no: number | null })[];
  const groupMatches = matches.filter((m) => m.stage === "group");
  if (groupMatches.some((m) => !m.games?.length && !m.walkover_winner_id)) return { error: "groupsNotFinished" };
  if (matches.some((m) => m.stage === "playoff" && (m.games?.length || m.walkover_winner_id))) {
    return { error: "playoffHasResults" };
  }

  const participants = (ps ?? []) as { id: string; group_no: number | null }[];
  const groups = [...new Set(participants.map((p) => p.group_no).filter((g): g is number => !!g))].sort((a, b) => a - b);
  const rows: GroupRow[] = groups.flatMap((g) => {
    const ids = participants.filter((p) => p.group_no === g).map((p) => p.id);
    return computeStandings(ids, groupMatches.filter((m) => m.group_no === g)).rows.map((r) => ({
      id: r.id,
      group: g,
      place: r.order + 1,
      played: r.played,
      points: r.points,
      diff: r.diff,
      against: r.shuttlesAgainst,
    }));
  });

  // Full ties among candidates for the extra places are drawn at random once, here.
  const draw = new Map(rows.map((r) => [r.id, Math.random()]));
  const seeded = seedQualifiers(rows, t.advance_per_group as number, t.fill_bracket as boolean, draw);
  if (seeded.length < 2) return { error: "tooFew" };
  const playoff = buildPlayoff(seeded, t.third_place as boolean).map((m) => ({
    tournament_id: id,
    stage: "playoff",
    tour: m.round,
    slot: m.slot,
    position: m.slot,
    home_id: m.home,
    away_id: m.away,
  }));

  await supabase.from("matches").delete().eq("tournament_id", id).eq("stage", "playoff");
  const { error } = await supabase.from("matches").insert(playoff);
  if (error) return { error: "generic" };
  revalidate(id);
  return {};
}

/** draft → announced: the tournament becomes public on the home page. */
export async function announceTournament(id: string): Promise<StatusActionState> {
  if (!(await getStaff())) return { error: "forbidden" };
  const supabase = await createClient();
  const { error } = await supabase.from("tournaments").update({ status: "announced" }).eq("id", id).eq("status", "draft");
  if (error) return { error: "generic" };
  revalidate(id);
  return {};
}

/** announced → draft: hides the announcement again. */
export async function unannounceTournament(id: string): Promise<StatusActionState> {
  if (!(await getStaff())) return { error: "forbidden" };
  const supabase = await createClient();
  const { error } = await supabase.from("tournaments").update({ status: "draft" }).eq("id", id).eq("status", "announced");
  if (error) return { error: "generic" };
  revalidate(id);
  return {};
}

/** active → draft: drops the schedule; only while no results are recorded. */
export async function backToDraft(id: string): Promise<StatusActionState> {
  if (!(await getStaff())) return { error: "forbidden" };
  const supabase = await createClient();
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", id)
    .or("games.not.is.null,walkover_winner_id.not.is.null");
  if (count) return { error: "hasResults" };

  const { error } = await supabase.from("tournaments").update({ status: "draft" }).eq("id", id).eq("status", "active");
  if (error) return { error: "generic" };
  await supabase.from("matches").delete().eq("tournament_id", id);
  revalidate(id);
  return {};
}

export async function finishTournament(id: string): Promise<StatusActionState> {
  if (!(await getStaff())) return { error: "forbidden" };
  const supabase = await createClient();
  const { error } = await supabase.from("tournaments").update({ status: "finished" }).eq("id", id).eq("status", "active");
  if (error) return { error: "generic" };
  revalidate(id);
  return {};
}

/** finished → active: owner only (enforced by RLS too). */
export async function reopenTournament(id: string): Promise<StatusActionState> {
  const staff = await getStaff();
  if (staff?.role !== "owner") return { error: "forbidden" };
  const supabase = await createClient();
  const { error } = await supabase.from("tournaments").update({ status: "active" }).eq("id", id).eq("status", "finished");
  if (error) return { error: "generic" };
  revalidate(id);
  return {};
}

/** Sets (or clears, with null) the cover; the previous file is removed from storage. */
export async function setCover(id: string, path: string | null): Promise<StatusActionState> {
  if (!(await getStaff())) return { error: "forbidden" };
  if (path !== null && !path.startsWith(`${id}/cover-`)) return { error: "forbidden" };
  const supabase = await createClient();
  const { data: before } = await supabase.from("tournaments").select("cover_path").eq("id", id).maybeSingle();
  const { data, error } = await supabase.from("tournaments").update({ cover_path: path }).eq("id", id).select("id");
  if (error || !data?.length) return { error: "forbidden" };
  if (before?.cover_path && before.cover_path !== path) {
    await supabase.storage.from(GALLERY_BUCKET).remove([before.cover_path]);
  }
  revalidate(id);
  return {};
}

export async function deleteTournament(id: string) {
  if (!(await getStaff())) return;
  const supabase = await createClient();
  // Photo rows cascade with the tournament; their files in storage don't.
  const { data: photos } = await supabase.from("tournament_photos").select("path, thumb_path").eq("tournament_id", id);
  const { data: cover } = await supabase.from("tournaments").select("cover_path").eq("id", id).maybeSingle();
  const { data: deleted } = await supabase.from("tournaments").delete().eq("id", id).select("id");
  const files = (photos ?? []).flatMap((p) => [p.path, p.thumb_path]);
  if (cover?.cover_path) files.push(cover.cover_path);
  if (deleted?.length && files.length) await supabase.storage.from(GALLERY_BUCKET).remove(files);
  revalidate();
  redirect({ href: "/", locale: await getLocale() });
}
