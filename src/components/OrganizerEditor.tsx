"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createMyProfile, deleteOrganizer, saveOrganizer, type OrganizerFormState } from "@/app/actions/organizers";
import type { Organizer } from "@/lib/organizers";

function OrganizerForm({ organizer, onDone }: { organizer?: Organizer; onDone: () => void }) {
  const t = useTranslations("organizers");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, action, pending] = useActionState(async (prev: OrganizerFormState, fd: FormData) => {
    const result = await saveOrganizer(organizer?.id ?? null, prev, fd);
    if (result.ok) onDone();
    return result;
  }, {});

  const field = (name: keyof Organizer, label: string, placeholder?: string, required = false) => (
    <label className="block text-sm">
      <span className="label">
        {label}
        {required && " *"}
      </span>
      <input name={name} defaultValue={organizer?.[name] ?? ""} placeholder={placeholder} required={required} className="input" />
    </label>
  );

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {field("name", t("name"), undefined, true)}
        {field("name_en", t("nameEn"))}
        {field("phone", t("phone"), "+66 81 234 5678")}
        {field("whatsapp", t("whatsapp"), "+66 81 234 5678")}
        {field("telegram", t("telegram"), "@username")}
        {field("line_id", t("line"), "LINE ID")}
      </div>
      <p className="text-xs text-muted">{t("hint")}</p>
      {state.error && (
        <p className="text-sm text-danger">{state.error === "nameRequired" ? t("nameRequired") : te(state.error)}</p>
      )}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending}>
          {tc("save")}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          {tc("cancel")}
        </button>
      </div>
    </form>
  );
}

/** Edit / delete controls for one profile card. */
export function OrganizerControls({ organizer, canDelete }: { organizer: Organizer; canDelete: boolean }) {
  const t = useTranslations("organizers");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  if (open) return <OrganizerForm organizer={organizer} onDone={() => setOpen(false)} />;
  return (
    <div className="flex gap-2">
      <button type="button" className="btn-secondary px-3 py-1" onClick={() => setOpen(true)}>
        {tc("edit")}
      </button>
      {canDelete && (
        <button
          type="button"
          className="btn-danger px-3 py-1"
          onClick={() => confirm(t("deleteConfirm")) && deleteOrganizer(organizer.id)}
        >
          {tc("delete")}
        </button>
      )}
    </div>
  );
}

export function AddOrganizer() {
  const t = useTranslations("organizers");
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <div className="card w-full p-4">
        <OrganizerForm onDone={() => setOpen(false)} />
      </div>
    );
  }
  return (
    <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
      + {t("add")}
    </button>
  );
}

export function CreateMyProfile() {
  const t = useTranslations("organizers");
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn-primary" disabled={pending} onClick={() => start(() => void createMyProfile())}>
      {t("createMine")}
    </button>
  );
}
