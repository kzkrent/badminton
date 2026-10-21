import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTournament } from "@/lib/tournament-data";
import { PLAYER_COLUMNS, type Player } from "@/lib/players";
import { canEdit, isPreStart, participantName, type Match, type MatchFormat } from "@/lib/tournaments";
import { groupLetter } from "@/lib/groups";
import { roundKey, rulesFor } from "@/lib/playoff";
import { ORGANIZER_COLUMNS, type Organizer } from "@/lib/organizers";
import {
  addParticipant,
  backToDraft,
  deleteTournament,
  finishTournament,
  removeParticipant,
  reopenTournament,
  saveTournament,
  startTournament,
  updateTeamNames,
  setCover,
  setParticipantGroup,
  buildPlayoffStage,
  announceTournament,
  unannounceTournament,
} from "@/app/actions/tournaments";
import { CoverEditor } from "@/components/CoverEditor";
import { TournamentHeader } from "@/components/TournamentHeader";
import { TournamentForm } from "@/components/TournamentForm";
import { ParticipantsManager } from "@/components/ParticipantsManager";
import { ParticipantLabel } from "@/components/ParticipantLabel";
import { TeamNameEditor } from "@/components/TeamNameEditor";
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
  const isDraft = isPreStart(tournament.status);
  const byId = new Map(participants.map((p) => [p.id, p]));
  const { data: orgRows } = await (await createClient()).from("organizers").select(ORGANIZER_COLUMNS).order("name");
  const organizers = (orgRows ?? []) as Organizer[];

  // Result editors: league — by tour; groups — by group and tour; playoff — by round with its own format.
  const isGroups = tournament.type === "groups_playoff";
  const groupMatches = matches.filter((m) => m.stage !== "playoff");
  const playoffMatches = matches.filter((m) => m.stage === "playoff");
  const playoffRounds = playoffMatches.length ? Math.max(...playoffMatches.map((m) => m.tour)) : 0;
  type Block = { key: string; title: string; matches: Match[]; format: (m: Match) => MatchFormat };
  const groupFormat = () => tournament.match_format;
  const blocks: Block[] = [];
  const groupNos = isGroups ? [...new Set(groupMatches.map((m) => m.group_no ?? 0))].sort((a, b) => a - b) : [0];
  for (const g of groupNos) {
    const inGroup = groupMatches.filter((m) => !isGroups || m.group_no === g);
    for (const tour of [...new Set(inGroup.map((m) => m.tour))].sort((a, b) => a - b)) {
      blocks.push({
        key: `g${g}-${tour}`,
        title: isGroups
          ? `${t("groupName", { letter: groupLetter(g) })} · ${t("tour", { n: tour })}`
          : t("tour", { n: tour }),
        matches: inGroup.filter((m) => m.tour === tour),
        format: groupFormat,
      });
    }
  }
  for (let r = 1; r <= playoffRounds; r++) {
    for (const slot of r === playoffRounds ? [0, 1] : [null]) {
      const ms = playoffMatches.filter((m) => m.tour === r && (slot === null || m.slot === slot));
      if (!ms.length) continue;
      const key = roundKey(r, playoffRounds, slot ?? 0);
      blocks.push({
        key: `p${r}-${slot ?? "all"}`,
        title: `${t("tabPlayoff")} · ${t(`round_${key}`)}`,
        matches: ms,
        format: () => rulesFor(tournament.playoff_settings, key).match_format,
      });
    }
  }

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

      <CoverEditor tournamentId={id} coverPath={tournament.cover_path} setCover={setCover.bind(null, id)} />

      <details open={isDraft && participants.length === 0} className="group">
        <summary className="mb-3 cursor-pointer text-lg font-semibold">{t("settings")}</summary>
        <TournamentForm
          action={saveTournament.bind(null, id)}
          tournament={tournament}
          disciplineLocked={participants.length > 0}
          canSetWeight={staff?.role === "owner"}
          organizers={organizers}
          playoffBuilt={playoffMatches.length > 0}
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
            renameAction={updateTeamNames.bind(null, id)}
            manualGroups={isGroups && tournament.group_seeding === "manual" ? (tournament.groups_count ?? 2) : 0}
            setGroup={setParticipantGroup.bind(null, id)}
          />
        ) : (
          <ul className="card divide-y divide-border">
            {participants.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <ParticipantLabel participant={p} locale={locale} />
                </span>
                {p.player2 && <TeamNameEditor participant={p} save={updateTeamNames.bind(null, id, p.id)} />}
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
          announce={announceTournament.bind(null, id)}
          unannounce={unannounceTournament.bind(null, id)}
          backToDraft={backToDraft.bind(null, id)}
          finish={finishTournament.bind(null, id)}
          reopen={reopenTournament.bind(null, id)}
          buildPlayoff={isGroups ? buildPlayoffStage.bind(null, id) : undefined}
          playoffBuilt={playoffMatches.length > 0}
          remove={deleteTournament.bind(null, id)}
        />
      </div>

      {blocks.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">{tr("title")}</h2>
          <div className="space-y-4">
            {blocks.map((b) => (
              <div key={b.key} className="card overflow-hidden">
                <h3 className="border-b border-border bg-background px-4 py-2 text-sm font-semibold">{b.title}</h3>
                <div className="divide-y divide-border">
                  {b.matches.map((m) => {
                    const home = byId.get(m.home_id ?? "");
                    const away = byId.get(m.away_id ?? "");
                    if (!home || !away) {
                      return (
                        <p key={m.id} className="px-4 py-3 text-sm text-muted">
                          {[home, away].map((p) => (p ? participantName(p, locale) : "—")).join(" — ")} · {tr("waiting")}
                        </p>
                      );
                    }
                    return (
                      <MatchResultEditor
                        key={m.id}
                        match={m}
                        home={home}
                        away={away}
                        format={b.format(m)}
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
