"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { sendMagicLink, type LoginState } from "@/app/actions/auth";

export function LoginForm() {
  const t = useTranslations("login");
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {
    status: "idle",
  });

  if (state.status === "sent") {
    return <div className="card p-4 text-sm">{t("sent")}</div>;
  }

  return (
    <form action={action} className="card space-y-4 p-6">
      <div>
        <label htmlFor="email" className="label">
          {t("email")}
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      {state.status === "notAllowed" && <p className="text-sm text-danger">{t("notAllowed")}</p>}
      {state.status === "error" && <p className="text-sm text-danger">{t("error")}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {t("send")}
      </button>
    </form>
  );
}
