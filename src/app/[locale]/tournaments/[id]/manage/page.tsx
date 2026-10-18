import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTournament } from "@/lib/tournament-data";
import { PLAYER_COLUMNS, type Player } from "@/lib/players";
import { canEdit } from "@/lib/tournaments";
import {
  addParticipant,
  backToDraft,
  deleteTournament,
  finishTournament,
  removeParticipant,
  reopenTournament,
  saveTournament,
  startTournament,
} from "@/app/actions/tournaments";
import { TournamentHeader } from "@/components/TournamentHeader";
import { TournamentForm } from "@/components/TournamentForm";
import { ParticipantsManager } from "@/components/ParticipantsManager";
import { ParticipantLabel } from "@/components/ParticipantLabel";
import { StatusActions } from "@/components/StatusActions";
import { MatchResultEditor } from "@/components/MatchResultEditor";
import { clearResult, saveResult } from "@/app/actions/results";

export default async function ManageTournamentPage({ params }: PageProps<"/[locale]/tournaments/[id]/manage">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const staff = await getStaff();
  if (!staff) redirect({ href: "/login", locale });

  const data = await loadTournament(id);
  if (!data) notFound();
  const { tournament, participants, matches } = data;
  if (!canEdit(staff?.role, tournament.status)) redirect({ href: `/tournaments/${id}`, locale });

  const t = await getTranslations("tournaments");
  const tr = await getTranslations("results");
  const isDraft = tournament.status === "draft";
  const byId = new Map(participants.map((p) => [p.id, p]));

  let players: Player[] = [];
  if (isDraft) {
    const supabase = await createClient();
    const { data: rows } = await supabase.from("players").select(PLAYER_COLUMNS).order("last_name_ru");
    players = (rows ?? []) as Player[];
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <TournamentHeader tournament={tournament} locale={locale} />
        <Link href={`/tournaments/${id}`} className="btn-secondary">
          {t("openPublic")}
        </Link>
      </div>

      <details open={isDraft && participants.length === 0} className="group">
        <summary className="mb-3 cursor-pointer text-lg font-semibold">{t("settings")}</summary>
        <TournamentForm
          action={saveTournament.bind(null, id)}
          tournament={tournament}
          disciplineLocked={participants.length > 0}
          cancelHref={`/tournaments/${id}/manage`}
        />
      </details>

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("participantsCount", { count: participants.length })}</h2>
        {isDraft ? (
          <ParticipantsManager
            discipline={tournament.discipline}
            players={players}
            participants={participants}
            addAction={addParticipant.bind(null, id)}
            removeAction={removeParticipant.bind(null, id)}
          />
        ) : (
          <ul className="card divide-y divide-border">
            {participants.map((p) => (
              <li key={p.id} className="px-4 py-2">
                <ParticipantLabel participant={p} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-4">
        <StatusActions
          status={tournament.status}
          isOwner={staff?.role === "owner"}
          start={startTournament.bind(null, id)}
          backToDraft={backToDraft.bind(null, id)}
          finish={finishTournament.bind(null, id)}
          reopen={reopenTournament.bind(null, id)}
          remove={deleteTournament.bind(null, id)}
        />
      </div>

      {matches.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">{tr("title")}</h2>
          <div className="space-y-4">
            {[...new Set(matches.map((m) => m.tour))].map((tour) => (
              <div key={tour} className="card overflow-hidden">
                <h3 className="border-b border-border bg-background px-4 py-2 text-sm font-semibold">
                  {t("tour", { n: tour })}
                </h3>
                <div className="divide-y divide-border">
                  {matches
                    .filter((m) => m.tour === tour)
                    .map((m) => {
                      const home = byId.get(m.home_id);
                      const away = byId.get(m.away_id);
                      if (!home || !away) return null;
                      return (
                        <MatchResultEditor
                          key={m.id}
                          match={m}
                          home={home}
                          away={away}
                          format={tournament.match_format}
                          save={saveResult.bind(null, m.id)}
                          clear={clearResult.bind(null, m.id)}
                        />
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
