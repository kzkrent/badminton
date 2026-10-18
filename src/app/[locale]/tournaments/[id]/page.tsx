import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { loadTournament } from "@/lib/tournament-data";
import { TournamentHeader } from "@/components/TournamentHeader";
import { ParticipantLabel } from "@/components/ParticipantLabel";
import { ScheduleView } from "@/components/ScheduleView";

export default async function TournamentPage({ params }: PageProps<"/[locale]/tournaments/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const data = await loadTournament(id);
  if (!data) notFound();
  const { tournament, participants, matches } = data;

  const t = await getTranslations("tournaments");
  const staff = await getStaff();

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

      {/* Standings table arrives in stage 3; until then list participants. */}
      <h2 className="mb-3 text-lg font-semibold">{t("participantsCount", { count: participants.length })}</h2>
      {participants.length === 0 ? (
        <div className="card mb-8 p-6 text-muted">{t("noParticipants")}</div>
      ) : (
        <ul className="card mb-8 divide-y divide-border">
          {participants.map((p) => (
            <li key={p.id} className="px-4 py-2">
              <ParticipantLabel participant={p} locale={locale} />
            </li>
          ))}
        </ul>
      )}

      {matches.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">{t("schedule")}</h2>
          <ScheduleView matches={matches} participants={participants} locale={locale} />
        </>
      )}
    </section>
  );
}
