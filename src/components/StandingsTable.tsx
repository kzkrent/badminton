"use client";

import { Fragment, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { StandingRow } from "@/lib/standings";
import { ageOn, fullName, type Player } from "@/lib/players";
import { participantName, type Match, type Participant } from "@/lib/tournaments";
import { Link } from "@/i18n/navigation";
import { ParticipantLabel } from "./ParticipantLabel";
import { PlayerAvatar } from "./PlayerAvatar";
import { MatchScore } from "./ScheduleView";

type Props = {
  rows: StandingRow[];
  unresolvedTies: string[][];
  participants: Participant[];
  matches: Match[];
  target: number;
};

const COLS = ["played", "for", "against", "diff", "points", "place"] as const;
/** Shuttles for/against stay on wider screens; the difference column carries them on phones. */
const HIDE_ON_MOBILE = new Set<string>(["for", "against"]);

export function StandingsTable({ rows, unresolvedTies, participants, matches, target }: Props) {
  const t = useTranslations("standings");
  const locale = useLocale();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [info, setInfo] = useState<Participant | null>(null);
  const byId = new Map(participants.map((p) => [p.id, p]));

  const value = (r: StandingRow, c: (typeof COLS)[number]) =>
    c === "played"
      ? r.played
      : c === "for"
        ? r.shuttlesFor
        : c === "against"
          ? r.shuttlesAgainst
          : c === "diff"
            ? (r.diff > 0 ? "+" : "") + r.diff
            : c === "points"
              ? r.points
              : (r.place ?? "—");

  return (
    <div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-3 py-2 text-left font-medium sm:px-4">{t("participant")}</th>
              {COLS.map((c) => (
                <th key={c} className={`px-1.5 py-2 text-center font-medium sm:px-2 ${HIDE_ON_MOBILE.has(c) ? "hidden sm:table-cell" : ""}`} title={t(`${c}Full`)}>
                  <abbr className="no-underline">{t(c)}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = byId.get(r.id);
              if (!p) return null;
              const open = expanded === r.id;
              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => setExpanded(open ? null : r.id)}
                    className={`cursor-pointer border-b border-border hover:bg-background ${open ? "bg-background" : ""}`}
                    aria-expanded={open}
                  >
                    <td className="px-3 py-2 sm:px-4">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1">
                          <ParticipantLabel participant={p} locale={locale} photosOnMobile={false} />
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInfo(p);
                          }}
                          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border font-serif text-xs text-muted italic hover:border-accent hover:text-accent"
                          aria-label={t("info")}
                          title={t("info")}
                        >
                          i
                        </button>
                      </div>
                    </td>
                    {COLS.map((c) => (
                      <td
                        key={c}
                        className={`px-1.5 py-2 text-center tabular-nums sm:px-2 ${c === "points" || c === "place" ? "font-semibold" : ""} ${HIDE_ON_MOBILE.has(c) ? "hidden sm:table-cell" : ""}`}
                      >
                        {value(r, c)}
                      </td>
                    ))}
                  </tr>
                  {open && (
                    <tr className="border-b border-border bg-background">
                      <td colSpan={COLS.length + 1} className="px-4 py-3">
                        <ParticipantMatches participant={p} matches={matches} byId={byId} target={target} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">{t("rowHint")}</p>
      {unresolvedTies.map((group) => (
        <p key={group.join()} className="mt-2 rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger">
          ⚠ {t("tieNotice", { names: group.map((id) => (byId.get(id) ? participantName(byId.get(id)!, locale) : id)).join(", ") })}
        </p>
      ))}
      {info && <ParticipantInfo participant={info} onClose={() => setInfo(null)} />}
    </div>
  );
}

function ParticipantMatches({
  participant,
  matches,
  byId,
  target,
}: {
  participant: Participant;
  matches: Match[];
  byId: Map<string, Participant>;
  target: number;
}) {
  const t = useTranslations("tournaments");
  const ts = useTranslations("standings");
  const locale = useLocale();
  const own = matches.filter((m) => m.home_id === participant.id || m.away_id === participant.id);
  if (own.length === 0) return <p className="text-sm text-muted">{ts("noMatches")}</p>;

  return (
    <ul className="space-y-1 text-sm">
      {own.map((m) => {
        const home = byId.get(m.home_id);
        const away = byId.get(m.away_id);
        if (!home || !away) return null;
        return (
          <li key={m.id} className="grid grid-cols-[4.5rem_1fr_auto_1fr] items-center gap-2">
            <span className="text-xs text-muted">{t("tour", { n: m.tour })}</span>
            <span className={`truncate ${home.id === participant.id ? "font-medium" : ""}`}>
              {participantName(home, locale)}
            </span>
            <span className="text-center">
              <MatchScore match={m} target={target} />
            </span>
            <span className={`truncate text-right ${away.id === participant.id ? "font-medium" : ""}`}>
              {participantName(away, locale)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ParticipantInfo({ participant, onClose }: { participant: Participant; onClose: () => void }) {
  const t = useTranslations("standings");
  const locale = useLocale();
  const players = [participant.player1, participant.player2].filter((p): p is Player => !!p);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4"
      role="dialog"
      aria-modal
      aria-label={participantName(participant, locale)}
      onClick={onClose}
    >
      <div className="card w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{participantName(participant, locale)}</h2>
          <button type="button" onClick={onClose} className="btn-secondary px-3 py-1">
            {t("close")}
          </button>
        </div>
        <div className={`grid gap-6 ${players.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {players.map((p) => (
            <PlayerCard key={p.id} player={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ player: p }: { player: Player }) {
  const t = useTranslations("players");
  const locale = useLocale();
  const format = useFormatter();
  const name = fullName(p, locale);
  const rows: [string, React.ReactNode][] = [
    [t("gender"), p.gender === "M" ? t("male") : t("female")],
    [
      t("birthDate"),
      p.birth_date &&
        `${format.dateTime(new Date(p.birth_date), { dateStyle: "medium", timeZone: "UTC" })} (${t("age", { age: ageOn(p.birth_date) })})`,
    ],
    [t("club"), p.club],
    [t("rating"), p.rating],
  ];

  return (
    <div>
      <div className="mb-3 flex flex-col items-center gap-2 text-center">
        <PlayerAvatar photoPath={p.photo_path} name={name} size={120} />
        <Link href={`/players/${p.id}`} className="font-medium hover:text-accent">
          {name}
        </Link>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
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
        <div className="mt-3">
          <h3 className="text-xs font-semibold text-muted">{t("achievements")}</h3>
          <p className="text-sm whitespace-pre-line">{p.achievements}</p>
        </div>
      )}
    </div>
  );
}
