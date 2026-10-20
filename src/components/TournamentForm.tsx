"use client";

import { startTransition, useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { organizerName, type Organizer } from "@/lib/organizers";
import type { TournamentFormState } from "@/app/actions/tournaments";
import { DISCIPLINES, isPreStart, type Tournament } from "@/lib/tournaments";
import { Link } from "@/i18n/navigation";

type Props = {
  action: (prev: TournamentFormState, fd: FormData) => Promise<TournamentFormState>;
  tournament?: Tournament;
  /** Discipline can't change while participants exist. */
  disciplineLocked?: boolean;
  /** Only the owner sets the rating weight. */
  canSetWeight?: boolean;
  organizers: Organizer[];
  /** Pre-selected organizer for a new tournament (the signed-in user's profile). */
  defaultOrganizerId?: string | null;
  cancelHref: string;
};

export function TournamentForm({
  action,
  tournament: t,
  disciplineLocked,
  canSetWeight,
  organizers,
  defaultOrganizerId,
  cancelHref,
}: Props) {
  const locale = useLocale();
  const tt = useTranslations("tournaments");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, formAction, pending] = useActionState(action, {});
  const formatLocked = !!t && !isPreStart(t.status);
  const [target, setTarget] = useState<15 | 21>(t?.game_target ?? 21);
  const [balance, setBalance] = useState(t?.balance ?? true);

  const error =
    state.error === "nameRequired"
      ? tt("nameRequired")
      : state.error === "balanceCap"
        ? tt("balanceCapError")
        : state.error === "weight"
          ? tt("weightError")
          : state.error === "endsBeforeStart"
            ? tt("endsBeforeStart")
          : state.error
            ? te(state.error)
            : null;

  const radio = (name: string, value: string, label: string, checked: boolean, disabled = false, onChange?: () => void) => (
    <label key={value} className="flex items-center gap-2 text-sm">
      <input type="radio" name={name} value={value} defaultChecked={checked} disabled={disabled} onChange={onChange} />
      {label}
    </label>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="card space-y-6 p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name_ru" className="label">
            {tt("nameRu")} *
          </label>
          <input id="name_ru" name="name_ru" required defaultValue={t?.name_ru} className="input" />
        </div>
        <div>
          <label htmlFor="name_en" className="label">
            {tt("nameEn")}
          </label>
          <input id="name_en" name="name_en" defaultValue={t?.name_en ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="starts_on" className="label">
            {tt("startsOn")}
          </label>
          <input id="starts_on" name="starts_on" type="date" defaultValue={t?.starts_on ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="ends_on" className="label">
            {tt("endsOn")}
          </label>
          <input id="ends_on" name="ends_on" type="date" defaultValue={t?.ends_on ?? ""} className="input" />
        </div>
        {canSetWeight && (
          <div>
            <label htmlFor="rating_weight" className="label">
              {tt("weight")}
            </label>
            <input
              id="rating_weight"
              name="rating_weight"
              type="number"
              min={0}
              max={3}
              step={0.25}
              defaultValue={t?.rating_weight ?? 1}
              className="input"
            />
            <p className="mt-1 text-xs text-muted">{tt("weightHint")}</p>
          </div>
        )}
      </div>

      <fieldset className="space-y-4 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold">{tt("announcementSection")}</legend>
        <div>
          <label htmlFor="organizer_id" className="label">
            {tt("organizer")}
          </label>
          <select
            id="organizer_id"
            name="organizer_id"
            defaultValue={t ? (t.organizer_id ?? "") : (defaultOrganizerId ?? "")}
            className="input"
          >
            <option value="">—</option>
            {organizers.map((o) => (
              <option key={o.id} value={o.id}>
                {organizerName(o, locale)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">{tt("organizerHint")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="start_time" className="label">
              {tt("startTime")}
            </label>
            <input id="start_time" name="start_time" type="time" defaultValue={t?.start_time?.slice(0, 5) ?? ""} className="input" />
          </div>
          <div>
            <label htmlFor="venue_ru" className="label">
              {tt("venueRu")}
            </label>
            <input id="venue_ru" name="venue_ru" defaultValue={t?.venue_ru ?? ""} className="input" />
          </div>
          <div>
            <label htmlFor="venue_en" className="label">
              {tt("venueEn")}
            </label>
            <input id="venue_en" name="venue_en" defaultValue={t?.venue_en ?? ""} className="input" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="announcement_ru" className="label">
              {tt("announcementRu")}
            </label>
            <textarea id="announcement_ru" name="announcement_ru" rows={4} defaultValue={t?.announcement_ru ?? ""} className="input" />
          </div>
          <div>
            <label htmlFor="announcement_en" className="label">
              {tt("announcementEn")}
            </label>
            <textarea id="announcement_en" name="announcement_en" rows={4} defaultValue={t?.announcement_en ?? ""} className="input" />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted">{tt("announcementHint")}</p>
        <div>
          <label htmlFor="registration_contact" className="label">
            {tt("extraContact")}
          </label>
          <input
            id="registration_contact"
            name="registration_contact"
            defaultValue={t?.registration_contact ?? ""}
            placeholder={tt("registrationContactHint")}
            className="input"
          />
        </div>
      </fieldset>

      <fieldset disabled={formatLocked} className="space-y-6">
        {formatLocked && <p className="text-sm text-muted">{tt("formatLocked")}</p>}

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <span className="label">{tt("type")}</span>
            {radio("type", "league", tt("type_league"), true)}
          </div>
          <div>
            <span className="label">{tt("rounds")}</span>
            <div className="space-y-1">
              {radio("rounds", "1", tt("rounds_1"), (t?.rounds ?? 1) === 1)}
              {radio("rounds", "2", tt("rounds_2"), t?.rounds === 2)}
            </div>
          </div>
        </div>

        <div>
          <span className="label">{tt("discipline")}</span>
          <div className="grid gap-1 sm:grid-cols-3">
            {DISCIPLINES.map((d) => radio("discipline", d, tt(`disc_${d}`), (t?.discipline ?? "M") === d, disciplineLocked))}
          </div>
          {disciplineLocked && !formatLocked && (
            <>
              <input type="hidden" name="discipline" value={t?.discipline} />
              <p className="mt-1 text-xs text-muted">{tt("disciplineLocked")}</p>
            </>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <span className="label">{tt("matchFormat")}</span>
            <div className="space-y-1">
              {radio("match_format", "best_of_three", tt("format_best_of_three"), (t?.match_format ?? "best_of_three") === "best_of_three")}
              {radio("match_format", "two_games", tt("format_two_games"), t?.match_format === "two_games")}
            </div>
          </div>
          <div>
            <span className="label">{tt("gameTarget")}</span>
            <div className="flex gap-4">
              {radio("game_target", "15", "15", target === 15, false, () => setTarget(15))}
              {radio("game_target", "21", "21", target === 21, false, () => setTarget(21))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="balance" checked={balance} onChange={(e) => setBalance(e.target.checked)} />
            {tt("balance")}
          </label>
          {balance && (
            <div className="w-32">
              <label htmlFor="balance_cap" className="label">
                {tt("balanceCap")}
              </label>
              <input
                id="balance_cap"
                name="balance_cap"
                type="number"
                min={target + 2}
                max={99}
                key={target}
                defaultValue={t?.balance_cap && t.game_target === target ? t.balance_cap : target === 21 ? 30 : 21}
                className="input"
              />
            </div>
          )}
          {balance && <p className="w-full text-xs text-muted">{tt("balanceCapHint")}</p>}
        </div>
      </fieldset>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-3">
        <button className="btn-primary" disabled={pending}>
          {tc("save")}
        </button>
        <Link href={cancelHref} className="btn-secondary">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
