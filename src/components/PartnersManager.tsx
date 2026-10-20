"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { deletePartner, savePartner } from "@/app/actions/partners";
import type { Partner } from "@/lib/partners";
import { PartnerForm } from "./PartnerForm";

/** Owner-only controls: add a partner, or edit / delete one (rendered next to each card). */
export function AddPartner() {
  const t = useTranslations("partners");
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + {t("add")}
      </button>
    );
  }
  return (
    <div className="w-full">
      <PartnerForm action={savePartner.bind(null, null)} onDone={() => setOpen(false)} />
    </div>
  );
}

export function EditPartner({ partner }: { partner: Partner }) {
  const t = useTranslations("partners");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="mt-3">
        <PartnerForm action={savePartner.bind(null, partner.id)} partner={partner} onDone={() => setOpen(false)} />
      </div>
    );
  }
  return (
    <div className="mt-3 flex gap-2 border-t border-border pt-3">
      <button type="button" className="btn-secondary px-3 py-1" onClick={() => setOpen(true)}>
        {tc("edit")}
      </button>
      <button
        type="button"
        className="btn-danger px-3 py-1"
        onClick={() => confirm(t("deleteConfirm")) && deletePartner(partner.id)}
      >
        {tc("delete")}
      </button>
    </div>
  );
}
