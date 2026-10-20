import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStaff, isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ageOn, fullName, PLAYER_COLUMNS, type Player } from "@/lib/players";
import { deletePlayer } from "@/app/actions/players";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StatusBadge } from "@/components/TournamentHeader";
import { loadPlayerHistory } from "@/lib/tournament-data";
import { loadRatings } from "@/lib/rating-data";
import { RATING_CATEGORIES } from "@/lib/rating";
import { RatingChart } from "@/components/RatingChart";
import { formatTournamentDates } from "@/lib/date-format";
import { participantName, tournamentName } from "@/lib/tournaments";

export default async function PlayerPage({ params }: PageProps<"/[locale]/players/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data } = await supabase.from("players").select(PLAYER_COLUMNS).eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as Player;

  const t = await getTranslations("players");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const tt = await getTranslations("tournaments");
  const owner = isOwner(await getStaff());
  const name = fullName(p, locale);
  const { history, total } = await loadPlayerHistory(p.id);
  const tr = await getTranslations("ratings");
  const ratings = await loadRatings();
  const tournamentNames = new Map(history.map((h) => [h.tournament.id, tournamentName(h.tournament, locale)]));

  const rows: [string, React.ReactNode][] = [
    [t("gender"), p.gender === "M" ? t("male") : t("female")],
    [
      t("birthDate"),
      p.birth_date &&
        `${format.dateTime(new Date(p.birth_date), { dateStyle: "long", timeZone: "UTC" })} (${t("age", { age: ageOn(p.birth_date) })})`,
    ],
    [t("club"), p.club],
  ];

  return (
    <section className="max-w-2xl">
      <Link href="/players" className="mb-4 inline-block text-sm text-muted hover:text-accent">
        ← {tc("back")}
      </Link>
      <div className="card p-6">
        <div className="mb-6 flex items-center gap-4">
          <PlayerAvatar photoPath={p.photo_path} name={name} size={96} />
          <div>
            <h1 className="text-2xl font-semibold">{name}</h1>
            {locale === "en" && p.first_name_en && (
              <p className="text-sm text-muted">{fullName(p, "ru")}</p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
          {rows
            .filter(([, v]) => v !== null && v !== "")
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>

        {p.achievements && (
          <div className="mt-6">
            <h2 className="mb-1 text-sm font-semibold text-muted">{t("achievements")}</h2>
            <p className="whitespace-pre-line text-sm">{p.achievements}</p>
          </div>
        )}

        {owner && (
          <div className="mt-6 flex gap-3 border-t border-border pt-4">
            <Link href={`/players/${p.id}/edit`} className="btn-secondary">
              {tc("edit")}
            </Link>
            <form action={deletePlayer.bind(null, p.id)}>
              <ConfirmButton message={t("deleteConfirm")} className="btn-danger">
                {tc("delete")}
              </ConfirmButton>
            </form>
          </div>
        )}
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold">{t("ratings")}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {RATING_CATEGORIES.map((cat) => {
          const r = ratings[cat].get(p.id);
          return (
            <div key={cat} className="card p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-muted">{tr(`cat_${cat}`)}</span>
                <span className="text-xs text-muted">
                  {r ? t("ratingMatches", { count: r.matches }) : t("noRating")}
                </span>
              </div>
              <div className="text-2xl font-semibold tabular-nums">{r ? Math.round(r.rating) : "—"}</div>
              {r && r.history.length >= 2 && (
                <RatingChart
                  start={r.history[0].before}
                  points={r.history.map((h) => ({
                    value: h.after,
                    delta: h.after - h.before,
                    label: tournamentNames.get(h.tournamentId) ?? "",
                  }))}
                  ariaLabel={`${tr(`cat_${cat}`)}: ${Math.round(r.history[0].before)} → ${Math.round(r.rating)}`}
                />
              )}
            </div>
          );
        })}
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold">{t("stats")}</h2>
      <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {(
          [
            [t("tournamentsCount"), history.length],
            [t("matchesPlayed"), total.played],
            [t("wins"), total.wins],
            [t("losses"), total.losses],
            [t("draws"), total.draws],
            [t("games"), `${total.gamesWon}:${total.gamesLost}`],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="card p-3 text-center">
            <div className="text-xl font-semibold tabular-nums">{value}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold">{t("history")}</h2>
      {history.length === 0 ? (
        <div className="card p-6 text-sm text-muted">{t("noHistory")}</div>
      ) : (
        <ul className="card divide-y divide-border">
          {history.map(({ tournament: tr, participant, place, participantsCount, record }) => {
            const partner = participant.player1.id === p.id ? participant.player2 : participant.player1;
            return (
              <li key={tr.id}>
                <Link href={`/tournaments/${tr.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-background">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{tournamentName(tr, locale)}</span>
                      <StatusBadge status={tr.status} />
                    </div>
                    <div className="truncate text-xs text-muted">
                      {[
                        formatTournamentDates(format, tr),
                        tt(`disc_${tr.discipline}`),
                        partner && participantName(participant, locale) + (participant.team_name || participant.team_name_en ? ` (${fullName(partner, locale)})` : ""),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">
                      {place ? t("placeOf", { place, count: participantsCount }) : "—"}
                    </div>
                    <div className="text-xs text-muted tabular-nums">
                      {t("record", { wins: record.wins, losses: record.losses })}
                      {record.draws > 0 && `–${record.draws}`}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
