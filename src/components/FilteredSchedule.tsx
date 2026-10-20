"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Match, Participant } from "@/lib/tournaments";
import { ScheduleView } from "./ScheduleView";

type Props = { matches: Match[]; participants: Participant[] };

/** Schedule with a multi-select tour filter; nothing selected = all tours. */
export function FilteredSchedule({ matches, participants }: Props) {
  const t = useTranslations("tournaments");
  const ts = useTranslations("standings");
  const tours = [...new Set(matches.map((m) => m.tour))].sort((a, b) => a - b);
  const [selected, setSelected] = useState<number[]>([]);

  const toggle = (tour: number) =>
    setSelected((cur) => (cur.includes(tour) ? cur.filter((x) => x !== tour) : [...cur, tour]));

  const chip = (active: boolean) =>
    `cursor-pointer rounded-full border px-3 py-1 text-xs ${
      active ? "border-accent bg-accent text-accent-contrast" : "border-border bg-surface hover:border-accent"
    }`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label={ts("filterTours")}>
        <button type="button" onClick={() => setSelected([])} className={chip(selected.length === 0)} aria-pressed={selected.length === 0}>
          {ts("allTours")}
        </button>
        {tours.map((tour) => (
          <button
            key={tour}
            type="button"
            onClick={() => toggle(tour)}
            className={chip(selected.includes(tour))}
            aria-pressed={selected.includes(tour)}
          >
            {t("tour", { n: tour })}
          </button>
        ))}
      </div>
      <ScheduleView
        matches={matches}
        participants={participants}
        tours={selected.length ? selected : undefined}
      />
    </div>
  );
}
