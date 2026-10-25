import { fullName, lastName, type Gender, type Player } from "./players";
import type { PlayoffSettings } from "./playoff";

/** ANY — pairs of any composition (M+M, F+F or M+F) in one tournament. */
export type Discipline = "M" | "F" | "MF" | "MM" | "FF" | "ANY";
export type MatchFormat = "two_games" | "best_of_three";
export type TournamentStatus = "draft" | "announced" | "active" | "finished";

/** Before the draw: participants and format can still change. */
export const isPreStart = (s: TournamentStatus) => s === "draft" || s === "announced";

export const DISCIPLINES: Discipline[] = ["M", "F", "MF", "MM", "FF", "ANY"];

export type Tournament = {
  id: string;
  name_ru: string;
  name_en: string | null;
  type: "league" | "groups_playoff";
  rounds: 1 | 2;
  discipline: Discipline;
  match_format: MatchFormat;
  game_target: 15 | 21;
  balance: boolean;
  balance_cap: number | null;
  starts_on: string | null;
  ends_on: string | null;
  status: TournamentStatus;
  /** Elo K multiplier, 0..3 (SPEC 8) */
  rating_weight: number;
  /** Path in the tournament-photos bucket */
  cover_path: string | null;
  venue_ru: string | null;
  venue_en: string | null;
  /** "HH:MM:SS" */
  start_time: string | null;
  announcement_ru: string | null;
  announcement_en: string | null;
  registration_contact: string | null;
  organizer_id: string | null;
  /** groups_playoff only */
  groups_count: number | null;
  advance_per_group: number | null;
  group_seeding: "rating" | "random" | "manual" | null;
  third_place: boolean;
  playoff_settings: PlayoffSettings | null;
};

export const TOURNAMENT_COLUMNS =
  "id, name_ru, name_en, type, rounds, discipline, match_format, game_target, balance, balance_cap, starts_on, ends_on, status, rating_weight, cover_path, venue_ru, venue_en, start_time, announcement_ru, announcement_en, registration_contact, organizer_id, groups_count, advance_per_group, group_seeding, third_place, playoff_settings";

export type Participant = {
  id: string;
  tournament_id: string;
  team_name: string | null;
  team_name_en: string | null;
  /** groups_playoff: 1-based group */
  group_no: number | null;
  player1: Player;
  player2: Player | null;
};

export const PARTICIPANT_COLUMNS = `id, tournament_id, team_name, team_name_en, group_no,
  player1:players!participants_player1_id_fkey(*),
  player2:players!participants_player2_id_fkey(*)`;

export type Match = {
  id: string;
  tour: number;
  position: number;
  /** null in playoff matches whose participants aren't known yet */
  home_id: string | null;
  away_id: string | null;
  stage: "group" | "playoff";
  group_no: number | null;
  /** playoff: position in the round (tour = round); slot 1 of the last round is the 3rd-place match */
  slot: number | null;
  games: [number, number][] | null;
  walkover_winner_id: string | null;
};

export const MATCH_COLUMNS = "id, tour, position, home_id, away_id, games, walkover_winner_id, stage, group_no, slot";

export const isDoubles = (d: Discipline) => d !== "M" && d !== "F";

/** Required genders of the lineup, in any order; null = any gender. */
const LINEUP: Record<Discipline, (Gender | null)[]> = {
  M: ["M"],
  F: ["F"],
  MF: ["M", "F"],
  MM: ["M", "M"],
  FF: ["F", "F"],
  ANY: [null, null],
};

export type LineupError = "size" | "gender" | "samePlayer";

/** Gender each player slot must have when picking a lineup; null = any. */
export const lineupSlots = (d: Discipline) => LINEUP[d];

export function validateLineup(discipline: Discipline, players: Pick<Player, "id" | "gender">[]): LineupError | null {
  const need = LINEUP[discipline];
  if (players.length !== need.length) return "size";
  if (players.length === 2 && players[0].id === players[1].id) return "samePlayer";
  if (need.every((g) => g === null)) return null;
  const have = players.map((p) => p.gender).sort();
  return have.join() === [...need].sort().join() ? null : "gender";
}

export const tournamentVenue = (t: Pick<Tournament, "venue_ru" | "venue_en">, locale: string) =>
  (locale === "en" && t.venue_en) || t.venue_ru;

export const tournamentAnnouncement = (t: Pick<Tournament, "announcement_ru" | "announcement_en">, locale: string) =>
  (locale === "en" ? t.announcement_en || t.announcement_ru : t.announcement_ru || t.announcement_en) ?? "";

export function tournamentName(t: Pick<Tournament, "name_ru" | "name_en">, locale: string) {
  return (locale === "en" && t.name_en) || t.name_ru;
}

/** Display name: singles — player's name; doubles — team name or "Last1 / Last2". */
export function participantName(p: Participant, locale: string): string {
  if (!p.player2) return fullName(p.player1, locale);
  const team = (locale === "en" && p.team_name_en) || p.team_name;
  return team || `${lastName(p.player1, locale) || fullName(p.player1, locale)} / ${lastName(p.player2, locale) || fullName(p.player2, locale)}`;
}

/** Second line under a team name: "Name1 / Name2". */
export function participantMembers(p: Participant, locale: string): string | null {
  if (!p.player2) return null;
  return `${fullName(p.player1, locale)} / ${fullName(p.player2, locale)}`;
}

/** Can the given staff role still change this tournament? */
export function canEdit(role: "owner" | "admin" | undefined, status: TournamentStatus) {
  return role === "owner" || (role === "admin" && status !== "finished");
}
