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
import { LiveRefresh } from "@/components/LiveRefresh";
import { AnnouncementDetails } from "@/components/AnnouncementDetails";
import { isPreStart } from "@/lib/tournaments";
import { TournamentGallery, type TournamentPhoto } from "@/components/TournamentGallery";
import { createClient } from "@/lib/supabase/server";
import { GALLERY_BUCKET, photoUrl } from "@/lib/supabase/env";
import Image from "next/image";

export default async function TournamentPage({ params }: PageProps<"/[locale]/tournaments/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const data = await loadTournament(id);
  if (!data) notFound();
  const { tournament, participants, matches } = data;

  const t = await getTranslations("tournaments");
  const ts = await getTranslations("standings");
  const staff = await getStaff();
  const supabase = await createClient();
  const { data: photoRows } = await supabase
    .from("tournament_photos")
    .select("id, path, thumb_path, width, height, uploaded_by")
    .eq("tournament_id", id)
    .order("created_at");
  const photos = (photoRows ?? []) as TournamentPhoto[];
  const standings = computeStandings(
    participants.map((p) => p.id),
    matches,
    tournament.game_target,
  );

  const cover = photoUrl(tournament.cover_path, GALLERY_BUCKET);

  return (
    <section>
      {cover && (
        <div className="relative mb-6 aspect-[3/1] overflow-hidden rounded-xl bg-border">
          <Image src={cover} alt="" fill priority unoptimized className="object-cover" />
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <TournamentHeader tournament={tournament} locale={locale} />
        {staff && (
          <Link href={`/tournaments/${id}/manage`} className="btn-secondary">
            {t("manage")}
          </Link>
        )}
      </div>

      {isPreStart(tournament.status) ? (
        <>
          <div className="card mb-8 p-4">
            <AnnouncementDetails tournament={tournament} locale={locale} />
          </div>
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
          {tournament.status === "active" && <LiveRefresh tournamentId={id} />}
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

      <TournamentGallery
        tournamentId={id}
        photos={photos}
        staff={staff ? { email: staff.email, isOwner: staff.role === "owner" } : null}
      />
    </section>
  );
}
