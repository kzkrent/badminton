import { describe, expect, it } from "vitest";
import { daysUntil, todayInLeague } from "./dates";

describe("league dates", () => {
  // 2026-10-20 20:00 UTC is already 2026-10-21 03:00 in Bangkok.
  const lateUtc = new Date("2026-10-20T20:00:00Z");

  it("uses Bangkok time for today", () => {
    expect(todayInLeague(lateUtc)).toBe("2026-10-21");
  });

  it("counts whole days", () => {
    expect(daysUntil("2026-10-21", lateUtc)).toBe(0);
    expect(daysUntil("2026-10-22", lateUtc)).toBe(1);
    expect(daysUntil("2026-10-31", lateUtc)).toBe(10);
    expect(daysUntil("2026-10-20", lateUtc)).toBe(-1);
  });
});
