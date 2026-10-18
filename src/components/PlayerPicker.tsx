"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { fullName, type Player } from "@/lib/players";
import { PlayerAvatar } from "./PlayerAvatar";

type Props = {
  label: string;
  players: Player[];
  value: Player | null;
  onChange: (p: Player | null) => void;
  onCreateNew: () => void;
};

/** Search-as-you-type player selector. */
export function PlayerPicker({ label, players, value, onChange, onCreateNew }: Props) {
  const t = useTranslations("tournaments");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  if (value) {
    const name = fullName(value, locale);
    return (
      <div>
        <span className="label">{label}</span>
        <div className="input flex items-center gap-2">
          <PlayerAvatar photoPath={value.photo_path} name={name} size={24} />
          <span className="flex-1 truncate">{name}</span>
          <button type="button" onClick={() => onChange(null)} className="cursor-pointer text-muted hover:text-danger" aria-label="×">
            ×
          </button>
        </div>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const matches = players
    .filter((p) =>
      !q
        ? true
        : [p.first_name_ru, p.last_name_ru, p.first_name_en, p.last_name_en, p.club]
            .filter(Boolean)
            .some((s) => s!.toLowerCase().includes(q)) || fullName(p, locale).toLowerCase().includes(q),
    )
    .slice(0, 8);

  return (
    <div className="relative">
      <span className="label">{label}</span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t("searchPlayer")}
        className="input"
      />
      {open && (
        <ul className="card absolute z-10 mt-1 max-h-72 w-full overflow-auto py-1 shadow-lg">
          {matches.map((p) => {
            const name = fullName(p, locale);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(p);
                    setQuery("");
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-background"
                >
                  <PlayerAvatar photoPath={p.photo_path} name={name} size={24} />
                  <span className="flex-1 truncate">{name}</span>
                  {p.club && <span className="truncate text-xs text-muted">{p.club}</span>}
                </button>
              </li>
            );
          })}
          {matches.length === 0 && <li className="px-3 py-1.5 text-sm text-muted">{t("noMatches")}</li>}
          <li className="border-t border-border">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onCreateNew}
              className="w-full cursor-pointer px-3 py-1.5 text-left text-sm text-accent hover:bg-background"
            >
              + {t("newPlayer")}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
