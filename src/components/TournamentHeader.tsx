import { getFormatter, getTranslations } from "next-intl/server";
import { tournamentName, type Tournament } from "@/lib/tournaments";

const STATUS_STYLE = {
  draft: "border-border text-muted",
  active: "border-accent text-accent",
  finished: "border-border text-foreground",
};

export async function StatusBadge({ status }: { status: Tournament["status"] }) {
  const t = await getTranslations("tournaments");
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
      {t(`status_${status}`)}
    </span>
  );
}

/** One-line summary: event · format · game settings. */
export async function tournamentSummary(t: Tournament) {
  const tt = await getTranslations("tournaments");
  return [
    tt(`disc_${t.discipline}`),
    tt(`rounds_${t.rounds}`),
    tt("summaryGame", { format: tt(`format_${t.match_format}`), target: t.game_target }),
    t.balance ? tt("summaryBalance", { cap: t.balance_cap ?? 0 }) : tt("summaryNoBalance"),
  ].join(" · ");
}

export async function TournamentHeader({ tournament: t, locale }: { tournament: Tournament; locale: string }) {
  const format = await getFormatter();
  return (
    <div className="mb-6">
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{tournamentName(t, locale)}</h1>
        <StatusBadge status={t.status} />
      </div>
      <p className="text-sm text-muted">
        {t.starts_on && `${format.dateTime(new Date(t.starts_on), { dateStyle: "long", timeZone: "UTC" })} · `}
        {await tournamentSummary(t)}
      </p>
    </div>
  );
}
