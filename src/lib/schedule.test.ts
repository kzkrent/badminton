import { describe, expect, it } from "vitest";
import { restingIn, roundRobin } from "./schedule";

const pairKey = (a: string, b: string) => [a, b].sort().join("-");

function checkSingleCircle(n: number) {
  const ps = Array.from({ length: n }, (_, i) => `P${i + 1}`);
  const fx = roundRobin(ps);
  const tours = n % 2 ? n : n - 1;

  expect(fx).toHaveLength((n * (n - 1)) / 2);
  expect(Math.max(...fx.map((f) => f.tour))).toBe(tours);
  // every pair meets exactly once
  expect(new Set(fx.map((f) => pairKey(f.home, f.away))).size).toBe(fx.length);
  // nobody plays twice in a tour; with odd n exactly one rests
  for (let t = 1; t <= tours; t++) {
    const inTour = fx.filter((f) => f.tour === t).flatMap((f) => [f.home, f.away]);
    expect(new Set(inTour).size).toBe(inTour.length);
    expect(restingIn(ps, fx, t)).toHaveLength(n % 2);
  }
  return { ps, fx };
}

describe("roundRobin", () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 11, 12])("covers every pair once for %i participants", (n) => {
    checkSingleCircle(n);
  });

  it("with odd count each participant rests exactly once", () => {
    const { ps, fx } = checkSingleCircle(5);
    const rested = [1, 2, 3, 4, 5].flatMap((t) => restingIn(ps, fx, t));
    expect(rested.sort()).toEqual([...ps].sort());
  });

  it("balances home and away within one", () => {
    const { ps, fx } = checkSingleCircle(6);
    for (const p of ps) {
      const home = fx.filter((f) => f.home === p).length;
      const away = fx.filter((f) => f.away === p).length;
      expect(Math.abs(home - away)).toBeLessThanOrEqual(1);
    }
  });

  it("mirrors the second circle with consecutive tour numbers", () => {
    const ps = ["A", "B", "C", "D", "E", "F"];
    const fx = roundRobin(ps, 2);
    expect(fx).toHaveLength(30);
    expect(Math.max(...fx.map((f) => f.tour))).toBe(10);
    const first = fx.filter((f) => f.tour <= 5);
    const second = fx.filter((f) => f.tour > 5);
    for (const f of first) {
      expect(second).toContainEqual({ tour: f.tour + 5, position: f.position, home: f.away, away: f.home });
    }
  });

  it("returns nothing for fewer than two participants", () => {
    expect(roundRobin([])).toEqual([]);
    expect(roundRobin(["A"])).toEqual([]);
  });
});
