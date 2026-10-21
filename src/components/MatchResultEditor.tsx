"use client";

import { startTransition, useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ResultState } from "@/app/actions/results";
import { participantName, type Match, type MatchFormat, type Participant } from "@/lib/tournaments";
import { ParticipantLabel } from "./ParticipantLabel";
import { maxGames } from "@/lib/scoring";

type Props = {
  match: Match;
  home: Participant;
  away: Participant;
  format: MatchFormat;
  save: (prev: ResultState, fd: FormData) => Promise<ResultState>;
  clear: () => Promise<ResultState>;
  /** Optional caption, e.g. the playoff round */
  caption?: string;
};

export function MatchResultEditor({ match, home, away, format, save, clear, caption }: Props) {
  const t = useTranslations("results");
  const te = useTranslations("errors");
  const locale = useLocale();
  const [state, action, pending] = useActionState(save, {});
  const [clearError, setClearError] = useState<ResultState["error"]>();
  const gameCount = maxGames(format);
  const hasResult = !!match.games || !!match.walkover_winner_id;
  const walkover = match.walkover_winner_id
    ? match.walkover_winner_id === match.home_id
      ? "home"
      : "away"
    : "";

  const shown = clearError ?? state.error;
  const error =
    shown === "game"
      ? t("err_game", { n: (state.gameIndex ?? 0) + 1 })
      : shown === "count" || shown === "empty" || shown === "nextPlayed" || shown === "notReady"
        ? t(`err_${shown}`)
        : shown
          ? te(shown)
          : null;

  const scoreInput = (name: string, value: number | undefined, label: string) => (
    <input
      name={name}
      type="number"
      min={0}
      max={99}
      inputMode="numeric"
      defaultValue={value ?? ""}
      aria-label={label}
      className="w-12 rounded-md border border-border bg-surface px-1 py-1 text-center text-sm outline-none focus:border-accent"
    />
  );

  return (
    <form
      // Remount with fresh defaults whenever the stored result changes.
      key={JSON.stringify([match.games, match.walkover_winner_id])}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className={`space-y-2 px-4 py-3 ${hasResult ? "" : "bg-background/50"}`}
    >
      {caption && <p className="text-xs font-medium text-muted">{caption}</p>}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
        <ParticipantLabel participant={home} locale={locale} size={24} />
        <span className="text-xs text-muted">—</span>
        <span className="flex min-w-0 justify-end text-right">
          <ParticipantLabel participant={away} locale={locale} size={24} />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {Array.from({ length: gameCount }, (_, i) => (
          <label key={i} className="flex items-center gap-1 text-xs text-muted">
            {t("game", { n: i + 1 })}
            {scoreInput(`g${i}_h`, match.games?.[i]?.[0], `${t("game", { n: i + 1 })} ${participantName(home, locale)}`)}
            :
            {scoreInput(`g${i}_a`, match.games?.[i]?.[1], `${t("game", { n: i + 1 })} ${participantName(away, locale)}`)}
          </label>
        ))}
        <label className="flex items-center gap-1 text-xs text-muted">
          {t("walkover")}
          <select name="walkover" defaultValue={walkover} className="rounded-md border border-border bg-surface px-1 py-1 text-sm">
            <option value="">—</option>
            <option value="home">{participantName(home, locale)}</option>
            <option value="away">{participantName(away, locale)}</option>
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          {state.saved && !state.error && !pending && <span className="text-xs text-accent">✓ {t("saved")}</span>}
          <button className="btn-primary px-3 py-1" disabled={pending}>
            {t("save")}
          </button>
          {hasResult && (
            <button type="button" onClick={() =>
                startTransition(async () => {
                  const res = await clear();
                  setClearError(res.error);
                })
              } className="btn-secondary px-3 py-1">
              {t("clear")}
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
