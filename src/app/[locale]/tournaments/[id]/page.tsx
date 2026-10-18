import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { loadTournament } from "@/lib/tournament-data";
import { computeStandings } from "@/lib/standings";
import { TournamentHeader } from "@/components/TournamentHeader";
import { ParticipantLabel } from "@/components/ParticipantLabel";
import { StandingsTable } from "@/components/StandingsTable";
import { FilteredSchedule } from "@/components/FilteredSchedule";

export default async function TournamentPage({ params }: PageProps<"/[locale]/tournaments/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const data = await loadTournament(id);
  if (!data) notFound();
  const { tournament, participants, matches } = data;

  const t = await getTranslations("tournaments");
  const ts = await getTranslations("standings");
  const staff = await getStaff();
  const standings = computeStandings(
    participants.map((p) => p.id),
    matches,
    tournament.game_target,
  );

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <TournamentHeader tournament={tournament} locale={locale} />
        {staff && (
          <Link href={`/tournaments/${id}/manage`} className="btn-secondary">
            {t("manage")}
          </Link>
        )}
      </div>

      {tournament.status === "draft" ? (
        <>
          <h2 className="mb-3 text-lg font-semibold">{t("participantsCount", { count: participants.length })}</h2>
          {participants.length === 0 ? (
            <div className="card p-6 text-muted">{t("noParticipants")}</div>
          ) : (
            <ul className="card divide-y divide-border">
              {participants.map((p) => (
                <li key={p.id} className="px-4 py-2">
                  <ParticipantLabel participant={p} locale={locale} />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <h2 className="mb-3 text-lg font-semibold">{ts("title")}</h2>
          <StandingsTable
            rows={standings.rows}
            unresolvedTies={standings.unresolvedTies}
            participants={participants}
            matches={matches}
            target={tournament.game_target}
          />

          <h2 className="mt-8 mb-3 text-lg font-semibold">{t("schedule")}</h2>
          <FilteredSchedule matches={matches} participants={participants} target={tournament.game_target} />
        </>
      )}
    </section>
  );
}
