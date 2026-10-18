import { describe, expect, it } from "vitest";
import type { Game, MatchLike } from "./scoring";
import { computeStandings } from "./standings";

const m = (home: string, away: string, ...games: Game[]): MatchLike => ({
  home_id: home,
  away_id: away,
  games,
  walkover_winner_id: null,
});
const wo = (home: string, away: string, winner: string): MatchLike => ({
  home_id: home,
  away_id: away,
  games: null,
  walkover_winner_id: winner,
});
const unplayed = (home: string, away: string): MatchLike => ({ home_id: home, away_id: away, games: null, walkover_winner_id: null });

const order = (s: ReturnType<typeof computeStandings>) => s.rows.map((r) => r.id);
const places = (s: ReturnType<typeof computeStandings>) => Object.fromEntries(s.rows.map((r) => [r.id, r.place]));

describe("computeStandings", () => {
  it("no matches played → no places", () => {
    const s = computeStandings(["A", "B"], [unplayed("A", "B")], 21);
    expect(s.rows.every((r) => r.place === null)).toBe(true);
    expect(s.unresolvedTies).toEqual([]);
  });

  it("1 point per game won; totals", () => {
    const s = computeStandings(["A", "B"], [m("A", "B", [21, 15], [18, 21], [21, 19])], 21);
    const a = s.rows.find((r) => r.id === "A")!;
    const b = s.rows.find((r) => r.id === "B")!;
    expect(a).toMatchObject({ played: 1, points: 2, shuttlesFor: 60, shuttlesAgainst: 55, diff: 5, place: "1" });
    expect(b).toMatchObject({ played: 1, points: 1, shuttlesFor: 55, shuttlesAgainst: 60, diff: -5, place: "2" });
  });

  it("walkover counts 2:0 with target:0 games", () => {
    const s = computeStandings(["A", "B"], [wo("A", "B", "B")], 15);
    expect(s.rows[0]).toMatchObject({ id: "B", points: 2, shuttlesFor: 30, shuttlesAgainst: 0 });
    expect(s.rows[1]).toMatchObject({ id: "A", points: 0, played: 1 });
  });

  it("two-way tie broken by head-to-head", () => {
    // A and B both 4 points; A won the head-to-head; B has better difference.
    const s = computeStandings(
      ["A", "B", "C", "D"],
      [
        m("A", "B", [21, 19], [21, 19]), // A 2, B 0
        m("A", "C", [19, 21], [19, 21]), // C 2
        m("A", "D", [21, 19], [21, 19]), // A 2 → A=4
        m("B", "C", [21, 0], [21, 0]), // B 2
        m("B", "D", [21, 0], [21, 0]), // B 2 → B=4
        m("C", "D", [0, 21], [0, 21]), // D 2 → C=2, D=2
      ],
      21,
    );
    expect(order(s).slice(0, 2)).toEqual(["A", "B"]);
    expect(s.rows[1].diff).toBeGreaterThan(s.rows[0].diff);
  });

  it("head-to-head draw (two_games 1:1) → overall difference", () => {
    const s = computeStandings(
      ["A", "B", "C"],
      [m("A", "B", [21, 10], [10, 21]), m("A", "C", [21, 0], [0, 21]), m("B", "C", [21, 5], [5, 21])],
      21,
    );
    // all 2 points; mini-table among all three equal → diff: all 0 → conceded: A 52? compute: equal diffs 0
    // A: for 21+10+21+0=52, against 10+21+0+21=52; B: 10+21+21+5=57, against 21+10+5+21=57; C: 0+21+5+21=47
    // diffs equal (0) → fewer conceded: C(47) > A(52) > B(57)
    expect(order(s)).toEqual(["C", "A", "B"]);
    expect(s.unresolvedTies).toEqual([]);
  });

  it("three-way cycle → overall difference", () => {
    const s = computeStandings(
      ["A", "B", "C"],
      [
        m("A", "B", [21, 10], [21, 10]), // A +22
        m("B", "C", [21, 19], [21, 19]), // B +4
        m("C", "A", [21, 19], [21, 19]), // C +4, A -4
      ],
      21,
    );
    // A diff +18, B -18, C 0
    expect(order(s)).toEqual(["A", "C", "B"]);
  });

  it("mini-table splits a three-way tie, then is re-applied to the remaining pair", () => {
    const s = computeStandings(
      ["A", "B", "C", "D"],
      [
        m("A", "B", [21, 0], [21, 0]), // A 2 : B 0
        m("A", "C", [21, 19], [19, 21], [19, 21]), // A 1 : C 2
        m("B", "C", [21, 19], [19, 21], [21, 19]), // B 2 : C 1
        m("D", "A", [21, 19], [21, 19]), // A 0
        m("D", "B", [21, 19], [19, 21], [21, 19]), // B 1
        m("D", "C", [21, 19], [21, 19]), // C 0
      ],
      21,
    );
    const pts = Object.fromEntries(s.rows.map((r) => [r.id, r.points]));
    expect(pts).toEqual({ A: 3, B: 3, C: 3, D: 6 });
    // Mini-table of A,B,C: A 3, C 3, B 2 → B third. A vs C re-applied: C won 2:1,
    // although A has the far better overall difference.
    expect(order(s)).toEqual(["D", "C", "A", "B"]);
    expect(s.rows.find((r) => r.id === "A")!.diff).toBeGreaterThan(s.rows.find((r) => r.id === "C")!.diff);
  });

  it("full tie → shared place and notice", () => {
    const s = computeStandings(
      ["A", "B", "C"],
      [m("A", "B", [21, 15], [15, 21]), m("A", "C", [21, 0], [21, 0]), m("B", "C", [21, 0], [21, 0])],
      21,
    );
    // A and B: 3 points, h2h 1:1, diff equal, conceded equal
    expect(places(s)).toEqual({ A: "1/2", B: "1/2", C: "3" });
    expect(s.unresolvedTies).toEqual([["A", "B"]]);
  });

  it("ignores unplayed matches", () => {
    const s = computeStandings(["A", "B", "C"], [m("A", "B", [21, 0], [21, 0]), unplayed("A", "C")], 21);
    expect(s.rows.map((r) => [r.id, r.played])).toEqual([
      ["A", 1],
      ["C", 0],
      ["B", 1],
    ]);
  });
});
