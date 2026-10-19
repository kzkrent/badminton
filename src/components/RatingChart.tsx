"use client";

import { useId, useState } from "react";

export type ChartPoint = { value: number; delta: number; label: string };

type Props = { start: number; points: ChartPoint[]; ariaLabel: string };

const W = 320;
const H = 120;
const PAD = { top: 10, right: 8, bottom: 10, left: 36 };

/** Rating after each match: single 2px line, recessive grid, crosshair + tooltip on hover/keyboard. */
export function RatingChart({ start, points, ariaLabel }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const tipId = useId();
  const values = [start, ...points.map((p) => p.value)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 20);
  const lo = (min + max) / 2 - span / 2 - span * 0.1;
  const hi = (min + max) / 2 + span / 2 + span * 0.1;

  const x = (i: number) => PAD.left + (i / Math.max(values.length - 1, 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const path = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15].map(Math.round);

  // Index into `values`: 0 is the starting rating, i ≥ 1 is points[i - 1].
  const pick = (clientX: number, rect: DOMRect) => {
    const rel = ((clientX - rect.left) / rect.width) * W;
    const i = Math.round(((rel - PAD.left) / (W - PAD.left - PAD.right)) * (values.length - 1));
    setActive(Math.min(Math.max(i, 1), values.length - 1));
  };

  const point = active !== null ? points[active - 1] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-accent"
        role="img"
        aria-label={ariaLabel}
        aria-describedby={point ? tipId : undefined}
        tabIndex={0}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((a) => Math.min((a ?? 0) + 1, values.length - 1));
          if (e.key === "ArrowLeft") setActive((a) => Math.max((a ?? values.length) - 1, 1));
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={9} fill="var(--muted)">
              {t}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {active !== null && (
          <>
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--muted)" strokeWidth={1} />
            <circle cx={x(active)} cy={y(values[active])} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
          </>
        )}
      </svg>
      {point && active !== null && (
        <div
          id={tipId}
          role="status"
          className="card pointer-events-none absolute top-0 z-10 px-2 py-1 text-xs whitespace-nowrap shadow"
          style={{
            left: `${(x(active) / W) * 100}%`,
            transform: `translateX(${active > values.length / 2 ? "-105%" : "5%"})`,
          }}
        >
          <div className="text-muted">{point.label}</div>
          <div className="font-semibold tabular-nums">
            {Math.round(point.value)}{" "}
            <span className="font-normal text-muted">
              ({point.delta >= 0 ? "+" : "−"}
              {Math.abs(Math.round(point.delta))})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
