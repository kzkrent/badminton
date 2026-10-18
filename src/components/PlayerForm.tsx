"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { PlayerFormState } from "@/app/actions/players";
import type { Player } from "@/lib/players";
import { Link } from "@/i18n/navigation";

type Props = {
  action: (prev: PlayerFormState, fd: FormData) => Promise<PlayerFormState>;
  player?: Player;
  /** Page to return to on cancel; or use onCancel for inline (dialog) use. */
  cancelHref?: string;
  onCancel?: () => void;
  /** Inline use: called with the created player instead of navigating away. */
  onCreated?: (player: Player) => void;
  defaultGender?: "M" | "F";
};

export function PlayerForm({ action, player, cancelHref, onCancel, onCreated, defaultGender }: Props) {
  const t = useTranslations("players");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.player) onCreated?.(state.player);
  }, [state.player, onCreated]);

  const error =
    state.error === "photoTooBig" || state.error === "photoType"
      ? t(state.error)
      : state.error
        ? te(state.error)
        : null;

  const field = (name: keyof Player, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} defaultValue={(player?.[name] as string | number | null) ?? ""} className="input" {...props} />
    </div>
  );

  return (
    // onSubmit instead of action={...}: React resets action forms, which would wipe input on validation errors.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="card space-y-6 p-6"
    >
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-muted">{t("nameRu")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            {field("first_name_ru", `${t("firstNameRu")} *`, { required: true })}
            {fe.first_name_ru && <p className="mt-1 text-xs text-danger">{t("required")}</p>}
          </div>
          {field("last_name_ru", t("lastNameRu"))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-muted">{t("nameEn")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("first_name_en", t("firstNameEn"))}
          {field("last_name_en", t("lastNameEn"))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <span className="label">{t("gender")} *</span>
          <div className="flex gap-4 pt-2 text-sm">
            {(["M", "F"] as const).map((g) => (
              <label key={g} className="flex items-center gap-2">
                <input type="radio" name="gender" value={g} defaultChecked={(player?.gender ?? defaultGender) === g} required />
                {g === "M" ? t("male") : t("female")}
              </label>
            ))}
          </div>
          {fe.gender && <p className="mt-1 text-xs text-danger">{t("required")}</p>}
        </div>
        {field("birth_date", t("birthDate"), { type: "date" })}
        {field("rating", t("rating"), { type: "number", step: "0.01" })}
      </div>

      {field("club", t("club"))}

      <div>
        <label htmlFor="achievements" className="label">
          {t("achievements")}
        </label>
        <textarea
          id="achievements"
          name="achievements"
          rows={4}
          defaultValue={player?.achievements ?? ""}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="photo" className="label">
          {t("photo")}
        </label>
        <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
        <p className="mt-1 text-xs text-muted">{t("photoHint")}</p>
        {player?.photo_path && (
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="remove_photo" />
            {t("removePhoto")}
          </label>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-3">
        <button className="btn-primary" disabled={pending}>
          {tc("save")}
        </button>
        {cancelHref ? (
          <Link href={cancelHref} className="btn-secondary">
            {tc("cancel")}
          </Link>
        ) : (
          <button type="button" onClick={onCancel} className="btn-secondary">
            {tc("cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
