import { describe, expect, it } from "vitest";
import {
  bracketOrder,
  buildPlayoff,
  firstRound,
  groupOutPlaces,
  loserTarget,
  playoffPlaces,
  roundKey,
  seedQualifiers,
  usedRoundKeys,
  winnerTarget,
  type GroupRow,
  type Qualifier,
} from "./playoff";
import { snakeGroups, validateGroups } from "./groups";

const q = (id: string, group: number): Qualifier => ({ id, group });

describe("groups", () => {
  it("snake distribution", () => {
    const g = snakeGroups(["1", "2", "3", "4", "5", "6", "7"], 3);
    expect([...g.values()]).toEqual([1, 2, 3, 3, 2, 1, 1]);
  });

  it("validates assignments", () => {
    const m = (pairs: [string, number | null][]) => new Map(pairs);
    expect(validateGroups(m([["a", 1], ["b", 1], ["c", 2], ["d", 2]]), 2, 2)).toBeNull();
    expect(validateGroups(m([["a", 1], ["b", 1], ["c", 2]]), 2, 1)).toBe("tooFewParticipants");
    expect(validateGroups(m([["a", 1], ["b", 1], ["c", 1], ["d", 2]]), 2, 1)).toBe("groupTooSmall");
    expect(validateGroups(m([["a", 1], ["b", 1], ["c", 2], ["d", null]]), 2, 1)).toBe("unassigned");
    expect(validateGroups(m([["a", 1], ["b", 1], ["c", 2], ["d", 2]]), 2, 3)).toBe("advanceTooMany");
  });
});

describe("bracket", () => {
  it("standard seed order", () => {
    expect(bracketOrder(4)).toEqual([1, 4, 2, 3]);
    expect(bracketOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("round keys", () => {
    expect(roundKey(1, 3)).toBe("qf");
    expect(roundKey(2, 3)).toBe("sf");
    expect(roundKey(3, 3)).toBe("final");
    expect(roundKey(3, 3, 1)).toBe("third");
    expect(usedRoundKeys(6, true)).toEqual(["qf", "sf", "final", "third"]);
    expect(usedRoundKeys(2, true)).toEqual(["final"]);
  });

  it("byes go to top seeds", () => {
    const pairs = firstRound([q("1", 1), q("2", 2), q("3", 3), q("4", 1), q("5", 2)]);
    expect(pairs.map(([a, b]) => [a?.id ?? null, b?.id ?? null])).toEqual([
      ["1", null],
      ["4", "5"],
      ["2", null],
      ["3", null],
    ]);
  });

  it("separates pairs from the same group in round 1", () => {
    // 2 groups × 2: A1, B1, then A2, B2 → standard pairs A1–B2, B1–A2 already fine.
    const ok = firstRound([q("A1", 1), q("B1", 2), q("A2", 1), q("B2", 2)]);
    expect(ok.every(([a, b]) => a!.group !== b!.group)).toBe(true);
    // Seeds where the standard order would clash: 1 vs 4 both group 1.
    const fixed = firstRound([q("s1", 1), q("s2", 2), q("s3", 2), q("s4", 1)]);
    expect(fixed.every(([a, b]) => a!.group !== b!.group)).toBe(true);
  });

  it("builds all rounds, byes start in round 2, 3rd-place match", () => {
    const m = buildPlayoff([q("1", 1), q("2", 2), q("3", 3), q("4", 1), q("5", 2)], true);
    expect(m).toEqual([
      { round: 1, slot: 1, home: "4", away: "5" },
      { round: 2, slot: 0, home: "1", away: null },
      { round: 2, slot: 1, home: "2", away: "3" },
      { round: 3, slot: 0, home: null, away: null },
      { round: 3, slot: 1, home: null, away: null },
    ]);
  });

  it("winner and loser targets", () => {
    expect(winnerTarget(1, 3, 3)).toEqual({ round: 2, slot: 1, side: "away" });
    expect(winnerTarget(3, 0, 3)).toBeNull();
    expect(loserTarget(2, 1, 3, true)).toEqual({ round: 3, slot: 1, side: "away" });
    expect(loserTarget(1, 1, 3, true)).toBeNull();
    expect(loserTarget(2, 1, 3, false)).toBeNull();
  });
});

describe("places", () => {
  it("from the bracket", () => {
    const p = playoffPlaces(
      [
        { round: 1, slot: 0, home: "a", away: "h", winner: "a" },
        { round: 1, slot: 1, home: "d", away: "e", winner: "d" },
        { round: 1, slot: 2, home: "b", away: "g", winner: "b" },
        { round: 1, slot: 3, home: "c", away: "f", winner: "c" },
        { round: 2, slot: 0, home: "a", away: "d", winner: "a" },
        { round: 2, slot: 1, home: "b", away: "c", winner: "c" },
        { round: 3, slot: 0, home: "a", away: "c", winner: "c" },
        { round: 3, slot: 1, home: "d", away: "b", winner: "b" },
      ],
      3,
    );
    expect(Object.fromEntries(p)).toEqual({ c: "1", a: "2", b: "3", d: "4", h: "5–8", e: "5–8", g: "5–8", f: "5–8" });
  });

  it("semifinal losers share 3–4 without a 3rd-place match", () => {
    const p = playoffPlaces(
      [
        { round: 1, slot: 0, home: "a", away: "d", winner: "a" },
        { round: 1, slot: 1, home: "b", away: "c", winner: "b" },
        { round: 2, slot: 0, home: "a", away: "b", winner: "a" },
      ],
      2,
    );
    expect(Object.fromEntries(p)).toEqual({ a: "1", b: "2", d: "3–4", c: "3–4" });
  });

  const rows: GroupRow[] = [
    { id: "A1", group: 1, place: 1, points: 6, diff: 20, against: 30 },
    { id: "A2", group: 1, place: 2, points: 3, diff: 0, against: 40 },
    { id: "A3", group: 1, place: 3, points: 0, diff: -20, against: 50 },
    { id: "B1", group: 2, place: 1, points: 6, diff: 30, against: 25 },
    { id: "B2", group: 2, place: 2, points: 4, diff: 5, against: 35 },
    { id: "B3", group: 2, place: 3, points: 1, diff: -35, against: 60 },
  ];

  it("seeds winners first, then by performance", () => {
    expect(seedQualifiers(rows, 2).map((x) => x.id)).toEqual(["B1", "A1", "B2", "A2"]);
  });

  it("non-qualifiers share ranges after the qualifiers", () => {
    expect(Object.fromEntries(groupOutPlaces(rows, 2))).toEqual({ A3: "5–6", B3: "5–6" });
  });
});
