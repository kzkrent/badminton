"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { addAdmin, type StaffFormState } from "@/app/actions/staff";

export function AddAdminForm() {
  const t = useTranslations("staff");
  const te = useTranslations("errors");
  const [state, action, pending] = useActionState<StaffFormState, FormData>(addAdmin, {});

  const error =
    state.error === "invalidEmail" || state.error === "exists"
      ? t(state.error)
      : state.error
        ? te(state.error)
        : null;

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="min-w-60 flex-1">
        <label htmlFor="admin-email" className="label">
          {t("email")}
        </label>
        <input id="admin-email" name="email" type="email" required className="input" />
      </div>
      <button className="btn-primary" disabled={pending}>
        {t("add")}
      </button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </form>
  );
}
