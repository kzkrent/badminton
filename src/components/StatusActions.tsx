"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { StatusActionState } from "@/app/actions/tournaments";
import type { TournamentStatus } from "@/lib/tournaments";

type Action = (prev: StatusActionState) => Promise<StatusActionState>;

type Props = {
  status: TournamentStatus;
  isOwner: boolean;
  start: Action;
  announce: Action;
  unannounce: Action;
  backToDraft: Action;
  finish: Action;
  reopen: Action;
  remove: () => Promise<void>;
  /** groups_playoff: build (or rebuild) the bracket from the group standings */
  buildPlayoff?: Action;
  playoffBuilt?: boolean;
};

function ActionButton({
  action,
  label,
  hint,
  confirmText,
  variant = "btn-secondary",
}: {
  action: Action;
  label: string;
  hint?: string;
  confirmText?: string;
  variant?: string;
}) {
  const t = useTranslations("tournaments");
  const te = useTranslations("errors");
  const [state, run, pending] = useActionState(action, {});
  const error = !state.error
    ? null
    : state.error === "groupsSetup"
      ? t(`err_group_${state.groupError ?? "unassigned"}`)
      : state.error === "tooFew" ||
          state.error === "hasResults" ||
          state.error === "groupsNotFinished" ||
          state.error === "playoffHasResults"
        ? t(`err_${state.error}`)
        : te(state.error);

  return (
    <form
      action={run}
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
      className="space-y-1"
    >
      <button className={variant} disabled={pending}>
        {label}
      </button>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}

export function StatusActions({
  status,
  isOwner,
  start,
  announce,
  unannounce,
  backToDraft,
  finish,
  reopen,
  remove,
  buildPlayoff,
  playoffBuilt,
}: Props) {
  const t = useTranslations("tournaments");

  return (
    <div className="flex flex-wrap items-start gap-6">
      {(status === "draft" || status === "announced") && (
        <ActionButton action={start} label={t("start")} hint={t("startHint")} variant="btn-primary" />
      )}
      {status === "draft" && <ActionButton action={announce} label={t("announce")} hint={t("announceHint")} />}
      {status === "announced" && <ActionButton action={unannounce} label={t("unannounce")} hint={t("unannounceHint")} />}
      {status === "active" && buildPlayoff && (
        <ActionButton
          action={buildPlayoff}
          label={t(playoffBuilt ? "rebuildPlayoff" : "buildPlayoff")}
          hint={t(playoffBuilt ? "rebuildPlayoffHint" : "buildPlayoffHint")}
          confirmText={playoffBuilt ? t("rebuildPlayoffConfirm") : undefined}
          variant={playoffBuilt ? "btn-secondary" : "btn-primary"}
        />
      )}
      {status === "active" && (
        <>
          <ActionButton action={finish} label={t("finish")} confirmText={t("finishConfirm")} variant="btn-primary" />
          <ActionButton action={backToDraft} label={t("backToDraft")} hint={t("backToDraftHint")} />
        </>
      )}
      {status === "finished" && isOwner && <ActionButton action={reopen} label={t("reopen")} />}
      {(status === "draft" || isOwner) && (
        <form
          action={remove}
          onSubmit={(e) => {
            if (!confirm(t("deleteConfirm"))) e.preventDefault();
          }}
          className="ml-auto"
        >
          <button className="btn-danger">{t("delete")}</button>
        </form>
      )}
    </div>
  );
}
