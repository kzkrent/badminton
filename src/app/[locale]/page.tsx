import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fullName, PLAYER_COLUMNS, type Player } from "@/lib/players";
import { MIN_RANKED_MATCHES, RATING_CATEGORIES } from "@/lib/rating";
import { loadRatings } from "@/lib/rating-data";
import { computeStandings } from "@/lib/standings";
import {
  MATCH_COLUMNS,
  PARTICIPANT_COLUMNS,
  participantName,
  TOURNAMENT_COLUMNS,
  tournamentName,
  type Match,
  type Participant,
  type Tournament,
} from "@/lib/tournaments";
import { TournamentCard } from "@/components/TournamentCard";
import { AnnouncementDetails } from "@/components/AnnouncementDetails";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { MatchScore } from "@/components/ScheduleView";

const RECENT_RESULTS = 6;
const TOP_N = 3;

type MatchRow = Match & { tournament_id: string };

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tt = await getTranslations("tournaments");
  const tr = await getTranslations("ratings");
  const staff = await getStaff();
  const supabase = await createClient();

  const { data: ts } = await supabase
    .from("tournaments")
    .select(TOURNAMENT_COLUMNS)
    .in("status", ["announced", "active", "finished"]);
  const tournaments = (ts ?? []) as Tournament[];
  const byTournament = new Map(tournaments.map((x) => [x.id, x]));
  const upcoming = tournaments
    .filter((x) => x.status === "announced")
    .sort((a, b) => (a.starts_on ?? "9999").localeCompare(b.starts_on ?? "9999"));
  const live = tournaments.filter((x) => x.status === "active");
  const publicIds = tournaments.map((x) => x.id);

  // Participants of upcoming/live tournaments, matches of live ones, and the latest results anywhere.
  const focusIds = [...upcoming, ...live].map((x) => x.id);
  const [{ data: ps }, { data: liveMs }, { data: recentMs }] = await Promise.all([
    focusIds.length
      ? supabase.from("participants").select(PARTICIPANT_COLUMNS).in("tournament_id", focusIds)
      : Promise.resolve({ data: [] }),
    live.length
      ? supabase.from("matches").select(`tournament_id, ${MATCH_COLUMNS}`).in("tournament_id", live.map((x) => x.id))
      : Promise.resolve({ data: [] }),
    publicIds.length
      ? supabase
          .from("matches")
          .select(`tournament_id, ${MATCH_COLUMNS}`)
          .in("tournament_id", publicIds)
          .or("games.not.is.null,walkover_winner_id.not.is.null")
          .order("updated_at", { ascending: false })
          .limit(RECENT_RESULTS)
      : Promise.resolve({ data: [] }),
  ]);
  const focusParticipants = (ps ?? []) as unknown as Participant[];
  const liveMatches = (liveMs ?? []) as MatchRow[];
  const recent = (recentMs ?? []) as MatchRow[];

  // Participants for recent results that aren't loaded yet.
  const known = new Map(focusParticipants.map((p) => [p.id, p]));
  const missing = [...new Set(recent.flatMap((m) => [m.home_id, m.away_id]))].filter((id) => !known.has(id));
  if (missing.length) {
    const { data } = await supabase.from("participants").select(PARTICIPANT_COLUMNS).in("id", missing);
    for (const p of (data ?? []) as unknown as Participant[]) known.set(p.id, p);
  }

  // Top of each rating category.
  const ratings = await loadRatings();
  const tops = RATING_CATEGORIES.map((cat) => ({
    cat,
    rows: [...ratings[cat].entries()]
      .filter(([, r]) => r.matches >= MIN_RANKED_MATCHES)
      .sort(([, a], [, b]) => b.rating - a.rating)
      .slice(0, TOP_N),
  })).filter((x) => x.rows.length);
  const topIds = tops.flatMap((x) => x.rows.map(([id]) => id));
  const { data: topPlayers } = topIds.length
    ? await supabase.from("players").select(PLAYER_COLUMNS).in("id", topIds)
    : { data: [] };
  const playersById = new Map(((topPlayers ?? []) as Player[]).map((p) => [p.id, p]));

  const nothing = !upcoming.length && !live.length && !recent.length && !tops.length;

  return (
    <section className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold">{t("title")}</h1>
        {staff && (
          <Link href="/tournaments/new" className="btn-primary">
            {tt("create")}
          </Link>
        )}
      </div>

      {nothing && <div className="card p-6 text-muted">{t("empty")}</div>}

      {upcoming.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">{t("upcoming")}</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((x) => {
              const count = focusParticipants.filter((p) => p.tournament_id === x.id).length;
              return (
                <li key={x.id}>
                  <TournamentCard tournament={x} locale={locale}>
                    <AnnouncementDetails tournament={x} locale={locale} clampText />
                    <p className="mt-2 text-xs text-muted">{tt("participantsCount", { count })}</p>
                  </TournamentCard>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {live.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">{t("live")}</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {live.map((x) => {
              const parts = focusParticipants.filter((p) => p.tournament_id === x.id);
              const ms = liveMatches.filter((m) => m.tournament_id === x.id);
              const played = ms.filter((m) => m.games || m.walkover_winner_id).length;
              const leaderRow = computeStandings(parts.map((p) => p.id), ms, x.game_target).rows[0];
              const leader = leaderRow?.place ? parts.find((p) => p.id === leaderRow.id) : undefined;
              return (
                <li key={x.id}>
                  <TournamentCard tournament={x} locale={locale}>
                    <div className="space-y-1 text-sm">
                      {leader && (
                        <p>
                          🏆 {t("leader")}: <span className="font-medium">{participantName(leader, locale)}</span>{" "}
                          <span className="text-muted">({t("points", { points: leaderRow.points })})</span>
                        </p>
                      )}
                      <p className="text-xs text-muted">{t("progress", { played, total: ms.length })}</p>
                    </div>
                  </TournamentCard>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">{t("recent")}</h2>
          <ul className="card divide-y divide-border">
            {recent.map((m) => {
              const home = known.get(m.home_id);
              const away = known.get(m.away_id);
              const tour = byTournament.get(m.tournament_id);
              if (!home || !away || !tour) return null;
              return (
                <li key={m.id}>
                  <Link href={`/tournaments/${tour.id}`} className="block px-4 py-2 hover:bg-background">
                    <div className="text-xs text-muted">
                      {tournamentName(tour, locale)} · {tt("tour", { n: m.tour })}
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                      <span className="truncate font-medium">{participantName(home, locale)}</span>
                      <MatchScore match={m} target={tour.game_target} />
                      <span className="truncate text-right font-medium">{participantName(away, locale)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tops.length > 0 && (
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("top")}</h2>
            <Link href="/ratings" className="text-sm text-accent hover:underline">
              {t("allRatings")} →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {tops.map(({ cat, rows }) => (
              <div key={cat} className="card p-4">
                <h3 className="mb-2 text-sm font-semibold text-muted">{tr(`cat_${cat}`)}</h3>
                <ol className="space-y-2">
                  {rows.map(([id, r], i) => {
                    const p = playersById.get(id);
                    if (!p) return null;
                    const name = fullName(p, locale);
                    return (
                      <li key={id}>
                        <Link href={`/players/${id}`} className="flex items-center gap-2 text-sm hover:text-accent">
                          <span className="w-4 text-muted">{i + 1}</span>
                          <PlayerAvatar photoPath={p.photo_path} name={name} size={28} />
                          <span className="min-w-0 flex-1 truncate">{name}</span>
                          <span className="font-semibold tabular-nums">{Math.round(r.rating)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}

      <p>
        <Link href="/tournaments" className="text-sm text-accent hover:underline">
          {t("allTournaments")} →
        </Link>
      </p>
    </section>
  );
}
