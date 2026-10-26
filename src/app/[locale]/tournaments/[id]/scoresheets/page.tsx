import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { loadTournament } from "@/lib/tournament-data";
import { formatTournamentDates } from "@/lib/date-format";
import { groupLetter } from "@/lib/groups";
import { roundKey, rulesFor } from "@/lib/playoff";
import { fullName } from "@/lib/players";
import { participantName, tournamentName, type Match, type MatchFormat, type Participant } from "@/lib/tournaments";
import { PrintButton } from "@/components/PrintButton";

const PER_PAGE = 5;

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

/** Referee scoresheets: 5 matches per A4 page, chosen by tour / group / playoff round (staff only). */
export default async function ScoresheetsPage({ params, searchParams }: PageProps<"/[locale]/tournaments/[id]/scoresheets">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!(await getStaff())) redirect({ href: "/login", locale });
  const data = await loadTournament(id);
  if (!data) notFound();
  const { tournament, participants, matches } = data;

  const t = await getTranslations("sheets");
  const tt = await getTranslations("tournaments");
  const format = await getFormatter();
  const sp = await searchParams;

  const isGroups = tournament.type === "groups_playoff";
  const groupMatches = matches.filter((m) => m.stage !== "playoff");
  const playoff = matches.filter((m) => m.stage === "playoff");
  const rounds = playoff.length ? Math.max(...playoff.map((m) => m.tour)) : 0;

  const tourOptions = [...new Set(groupMatches.map((m) => m.tour))].sort((a, b) => a - b);
  const groupOptions = isGroups ? [...new Set(groupMatches.map((m) => m.group_no ?? 0))].sort((a, b) => a - b) : [];
  const roundOptions = Array.from({ length: rounds }, (_, i) => i + 1);

  const selTours = list(sp.t).map(Number);
  const selGroups = list(sp.g).map(Number);
  const selRounds = list(sp.r).map(Number);
  const includePlayed = sp.all === "1";
  const anyFilter = selTours.length + selGroups.length + selRounds.length > 0;

  const decided = (m: Match) => !!m.games?.length || !!m.walkover_winner_id;
  // No filter → everything. Tour/group filters pick group-stage matches; round filters pick playoff matches.
  const groupStagePicked = selTours.length > 0 || selGroups.length > 0;
  const pickGroupMatch = (m: Match) =>
    !anyFilter ||
    (groupStagePicked &&
      (!selTours.length || selTours.includes(m.tour)) &&
      (!selGroups.length || selGroups.includes(m.group_no ?? 0)));
  const chosen = [
    ...groupMatches
      .filter(pickGroupMatch)
      .sort((a, b) => (a.group_no ?? 0) - (b.group_no ?? 0) || a.tour - b.tour || a.position - b.position),
    ...playoff
      .filter((m) => !anyFilter || selRounds.includes(m.tour))
      .sort((a, b) => a.tour - b.tour || (a.slot ?? 0) - (b.slot ?? 0)),
  ].filter((m) => includePlayed || !decided(m));

  const byId = new Map(participants.map((p) => [p.id, p]));
  const label = (m: Match) =>
    m.stage === "playoff"
      ? tt(`round_${roundKey(m.tour, rounds, m.slot ?? 0)}`)
      : isGroups
        ? `${tt("groupName", { letter: groupLetter(m.group_no ?? 0) })} · ${tt("tour", { n: m.tour })}`
        : tt("tour", { n: m.tour });
  const rules = (m: Match) =>
    m.stage === "playoff"
      ? rulesFor(tournament.playoff_settings, roundKey(m.tour, rounds, m.slot ?? 0))
      : tournament;
  const formatLine = (m: Match) => {
    const r = rules(m);
    return [
      tt("summaryGame", { format: tt(`format_${r.match_format as MatchFormat}`), target: r.game_target }),
      r.balance ? tt("summaryBalance", { cap: r.balance_cap ?? 0 }) : tt("summaryNoBalance"),
    ].join(" · ");
  };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const qr = await QRCode.toString(`${origin}/${locale}/tournaments/${id}/manage`, { type: "svg", margin: 0 });
  const title = tournamentName(tournament, locale);
  const dates = formatTournamentDates(format, tournament);

  const team = (p: Participant | undefined) =>
    p ? (
      <>
        <div className="truncate text-[11pt] font-bold">{participantName(p, locale)}</div>
        {p.player2 && (
          <div className="truncate text-[8pt]">
            {fullName(p.player1, locale)} / {fullName(p.player2, locale)}
          </div>
        )}
      </>
    ) : (
      <div className="h-8 border-b border-black" />
    );

  const chip = (name: string, value: number, checked: boolean, text: string) => (
    <label key={`${name}${value}`} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} />
      {text}
    </label>
  );

  return (
    <section>
      <div className="mb-6 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="mr-auto text-2xl font-semibold">{t("title")}</h1>
          <Link href={`/tournaments/${id}/manage`} className="btn-secondary">
            {t("back")}
          </Link>
          <PrintButton label={t("print")} />
        </div>
        <p className="text-sm text-muted">{t("hint", { count: chosen.length, pages: Math.ceil(chosen.length / PER_PAGE) })}</p>
        <form className="card space-y-3 p-4">
          {tourOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">{t("tours")}:</span>
              {tourOptions.map((n) => chip("t", n, selTours.includes(n), tt("tour", { n })))}
            </div>
          )}
          {groupOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">{t("groups")}:</span>
              {groupOptions.map((g) => chip("g", g, selGroups.includes(g), tt("groupName", { letter: groupLetter(g) })))}
            </div>
          )}
          {roundOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">{tt("tabPlayoff")}:</span>
              {roundOptions.map((r) => chip("r", r, selRounds.includes(r), tt(`round_${roundKey(r, rounds)}`)))}
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="all" value="1" defaultChecked={includePlayed} />
            {t("includePlayed")}
          </label>
          <p className="text-xs text-muted">{t("filterHint")}</p>
          <button className="btn-secondary">{t("apply")}</button>
        </form>
      </div>

      {chosen.length === 0 ? (
        <div className="card p-6 text-sm text-muted print:hidden">{t("empty")}</div>
      ) : (
        <div className="mx-auto w-full max-w-[194mm] overflow-x-auto bg-white text-black shadow print:max-w-none print:shadow-none">
          {chosen.map((m, i) => {
            const bestOfThree = rules(m).match_format === "best_of_three";
            const games = bestOfThree ? [1, 2, 3] : [1, 2];
            return (
              <article
                key={m.id}
                className={`flex h-[55mm] min-w-[180mm] flex-col gap-1 border-b border-dashed border-black px-3 py-2 text-[9pt] break-inside-avoid ${
                  (i + 1) % PER_PAGE === 0 ? "break-after-page" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate">
                      <b>{title}</b>
                      {dates && ` · ${dates}`}
                    </div>
                    <div>
                      <b className="text-[11pt]">{label(m)}</b> · {t("match", { n: i + 1 })} · {formatLine(m)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-[11pt] font-bold">
                    {t("court")}
                    <span className="inline-block h-9 w-16 border-2 border-black" />
                  </div>
                </div>

                <div className="flex flex-1 gap-3">
                  <table className="flex-1 border-collapse">
                    <thead>
                      <tr className="text-[8pt]">
                        <th className="w-full border border-black px-2 py-0.5 text-left font-semibold">{t("team")}</th>
                        {games.map((g) => (
                          <th key={g} className="border border-black px-1 py-0.5 font-semibold whitespace-nowrap">
                            {t("game", { n: g })}
                            {g === 3 && <div className="font-normal">{t("ifTied")}</div>}
                          </th>
                        ))}
                        <th className="border-2 border-black px-1 py-0.5 font-bold whitespace-nowrap">{t("total")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[m.home_id, m.away_id].map((pid, row) => (
                        <tr key={row}>
                          <td className="max-w-[90mm] border border-black px-2 py-1">{team(byId.get(pid ?? ""))}</td>
                          {games.map((g) => (
                            <td key={g} className="h-10 w-[17mm] border border-black" />
                          ))}
                          <td className="w-[17mm] border-2 border-black" />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex w-[22mm] shrink-0 flex-col items-center justify-center text-center text-[7pt]">
                    <div className="h-[18mm] w-[18mm]" dangerouslySetInnerHTML={{ __html: qr }} />
                    {t("qr")}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 text-[9pt]">
                  <b>{t("noShow")}:</b>
                  {[m.home_id, m.away_id].map((pid, row) => {
                    const p = byId.get(pid ?? "");
                    return (
                      <span key={row} className="flex min-w-0 items-center gap-1.5">
                        <span className="inline-block h-3.5 w-3.5 shrink-0 border border-black" />
                        <span className="truncate">{p ? participantName(p, locale) : t(row === 0 ? "team1" : "team2")}</span>
                      </span>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
