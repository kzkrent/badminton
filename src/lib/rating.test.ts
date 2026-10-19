import { describe, expect, it } from "vitest";
import { actualScore, categoryOf, computeRatings, expected, lastTournamentChange, type RatingMatch } from "./rating";

const singles = (id: string, home: string, away: string, games: RatingMatch["games"], tournamentId = "T1"): RatingMatch => ({
  id,
  tournamentId,
  category: "singles",
  home: [home],
  away: [away],
  games,
});

describe("basics", () => {
  it("categories", () => {
    expect(categoryOf("M")).toBe("singles");
    expect(categoryOf("F")).toBe("singles");
    expect(categoryOf("MM")).toBe("doubles");
    expect(categoryOf("FF")).toBe("doubles");
    expect(categoryOf("MF")).toBe("mixed");
  });

  it("expected score", () => {
    expect(expected(1500, 1500)).toBe(0.5);
    expect(expected(1600, 1500)).toBeCloseTo(0.64, 2);
  });

  it("actual score with margin", () => {
    expect(actualScore(2, 0)).toBe(1);
    expect(actualScore(2, 1)).toBe(0.75);
    expect(actualScore(1, 1)).toBe(0.5);
    expect(actualScore(1, 2)).toBe(0.25);
    expect(actualScore(0, 2)).toBe(0);
  });
});

describe("computeRatings", () => {
  it("2:0 between equals with provisional K: +20 / −20", () => {
    const r = computeRatings([singles("m1", "A", "B", [[21, 10], [21, 10]])]).singles;
    expect(r.get("A")!.rating).toBe(1520);
    expect(r.get("B")!.rating).toBe(1480);
  });

  it("2:1 gives a smaller swing than 2:0", () => {
    const r = computeRatings([singles("m1", "A", "B", [[21, 10], [10, 21], [21, 10]])]).singles;
    expect(r.get("A")!.rating).toBe(1510);
    expect(r.get("B")!.rating).toBe(1490);
  });

  it("uses seeds and the SPEC example (1600 vs 1500, K=20 after 10 matches)", () => {
    const warmup: RatingMatch[] = Array.from({ length: 10 }, (_, i) => singles(`w${i}`, "A", "B", [[21, 10], [10, 21]]));
    const seeds = new Map([["A", 1600], ["B", 1500]]);
    const before = computeRatings(warmup, seeds).singles;
    const a0 = before.get("A")!.rating;
    const b0 = before.get("B")!.rating;
    const after = computeRatings([...warmup, singles("x", "A", "B", [[21, 10], [21, 10]])], seeds).singles;
    expect(after.get("A")!.rating - a0).toBeCloseTo(20 * (1 - expected(a0, b0)), 6);
    expect(after.get("B")!.rating - b0).toBeCloseTo(-20 * (1 - expected(a0, b0)), 6);
  });

  it("doubles: team average for expectation, both partners move", () => {
    const seeds = new Map([["A", 1600], ["B", 1400], ["C", 1500], ["D", 1500]]);
    const r = computeRatings(
      [{ id: "d1", tournamentId: "T", category: "doubles", home: ["A", "B"], away: ["C", "D"], games: [[21, 5], [21, 5]] }],
      seeds,
    ).doubles;
    expect(r.get("A")!.rating).toBe(1620);
    expect(r.get("B")!.rating).toBe(1420);
    expect(r.get("C")!.rating).toBe(1480);
    expect(r.get("D")!.rating).toBe(1480);
  });

  it("keeps categories apart", () => {
    const r = computeRatings([
      singles("s", "A", "B", [[21, 0], [21, 0]]),
      { id: "x", tournamentId: "T", category: "mixed", home: ["A", "F"], away: ["B", "G"], games: [[0, 21], [0, 21]] },
    ]);
    expect(r.singles.get("A")!.rating).toBe(1520);
    expect(r.mixed.get("A")!.rating).toBe(1480);
    expect(r.doubles.size).toBe(0);
  });

  it("change over the last tournament", () => {
    const r = computeRatings([
      singles("1", "A", "B", [[21, 0], [21, 0]], "T1"),
      singles("2", "A", "B", [[21, 0], [21, 0]], "T2"),
      singles("3", "A", "B", [[0, 21], [0, 21]], "T2"),
    ]).singles;
    const a = r.get("A")!;
    expect(lastTournamentChange(a)).toBeCloseTo(a.rating - a.history[1].before, 6);
    expect(a.matches).toBe(3);
  });
});
