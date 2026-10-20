"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { ParticipantFormState } from "@/app/actions/tournaments";
import type { Participant } from "@/lib/tournaments";

type Props = {
  participant: Participant;
  save: (prev: ParticipantFormState, fd: FormData) => Promise<ParticipantFormState>;
};

/** Pencil button that edits a team's Russian and English names in place. */
export function TeamNameEditor({ participant: p, save }: Props) {
  const t = useTranslations("tournaments");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: ParticipantFormState, fd: FormData) => {
    const result = await save(prev, fd);
    if (result.ok) setOpen(false);
    return result;
  }, {});

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer text-sm text-muted hover:text-accent"
        aria-label={t("editTeamName")}
        title={t("editTeamName")}
      >
        ✎
      </button>
    );
  }

  return (
    <form action={action} className="flex w-full flex-wrap items-end gap-2 pt-2">
      <label className="min-w-40 flex-1 text-xs text-muted">
        {t("teamName")}
        <input name="team_name" defaultValue={p.team_name ?? ""} placeholder={t("teamNameHint")} className="input mt-1" />
      </label>
      <label className="min-w-40 flex-1 text-xs text-muted">
        {t("teamNameEn")}
        <input name="team_name_en" defaultValue={p.team_name_en ?? ""} placeholder={t("teamNameEnHint")} className="input mt-1" />
      </label>
      <button className="btn-primary px-3 py-2" disabled={pending}>
        {tc("save")}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="btn-secondary px-3 py-2">
        {tc("cancel")}
      </button>
      {state.error && <p className="w-full text-xs text-danger">{te(state.error === "forbidden" ? "forbidden" : "generic")}</p>}
    </form>
  );
}
