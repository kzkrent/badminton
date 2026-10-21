"use client";

import { useTranslations } from "next-intl";
import { DEFAULT_ROUND_RULES, usedRoundKeys, type PlayoffSettings, type RoundKey } from "@/lib/playoff";

type Props = {
  settings: PlayoffSettings | null;
  qualifiers: number;
  thirdPlace: boolean;
  onThirdPlace: (v: boolean) => void;
  disabled?: boolean;
};

/** Per-round rules for the playoff: one row for each round this bracket size uses. */
export function PlayoffSettingsEditor({ settings, qualifiers, thirdPlace, onThirdPlace, disabled }: Props) {
  const tt = useTranslations("tournaments");
  const keys: RoundKey[] = usedRoundKeys(Math.max(2, qualifiers), thirdPlace);

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="third_place" checked={thirdPlace} onChange={(e) => onThirdPlace(e.target.checked)} />
        {tt("thirdPlace")}
      </label>
      <p className="text-xs text-muted">{tt("playoffHint", { count: qualifiers })}</p>
      <p className="text-xs text-muted">{tt("playoffFormat")}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[380px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1 pr-2 font-medium">{tt("round")}</th>
              <th className="py-1 pr-2 font-medium">{tt("gameTarget")}</th>
              <th className="py-1 pr-2 font-medium">{tt("balance")}</th>
              <th className="py-1 font-medium">{tt("balanceCap")}</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const r = settings?.[key] ?? DEFAULT_ROUND_RULES;
              return (
                <tr key={key} className="border-t border-border">
                  <td className="py-2 pr-2 font-medium whitespace-nowrap">{tt(`round_${key}`)}</td>
                  <td className="py-2 pr-2">
                    <select name={`po_${key}_target`} defaultValue={String(r.game_target)} className="input w-20 py-1">
                      <option value="15">15</option>
                      <option value="21">21</option>
                    </select>
                  </td>
                  <td className="py-2 pr-2 text-center">
                    <input type="checkbox" name={`po_${key}_balance`} defaultChecked={r.balance} aria-label={tt("balance")} />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      name={`po_${key}_cap`}
                      min={17}
                      max={99}
                      defaultValue={r.balance_cap ?? (r.game_target === 21 ? 30 : 21)}
                      className="input w-20 py-1"
                      aria-label={tt("balanceCap")}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}
