import { describe, expect, it } from "vitest";
import { displayGames, isValidGame, matchPoints, outcome, validateMatch, type GameRules } from "./scoring";

const r21: GameRules = { target: 21, balance: true, cap: 30 };
const r21nb: GameRules = { target: 21, balance: false, cap: null };
const r15: GameRules = { target: 15, balance: true, cap: 21 };

describe("isValidGame", () => {
  it("with balance", () => {
    expect(isValidGame([21, 19], r21)).toBe(true);
    expect(isValidGame([21, 0], r21)).toBe(true);
    expect(isValidGame([19, 21], r21)).toBe(true);
    expect(isValidGame([21, 20], r21)).toBe(false);
    expect(isValidGame([22, 20], r21)).toBe(true);
    expect(isValidGame([23, 20], r21)).toBe(false);
    expect(isValidGame([29, 27], r21)).toBe(true);
    expect(isValidGame([30, 28], r21)).toBe(true);
    expect(isValidGame([30, 29], r21)).toBe(true);
    expect(isValidGame([31, 29], r21)).toBe(false);
    expect(isValidGame([20, 18], r21)).toBe(false);
    expect(isValidGame([15, 13], r15)).toBe(true);
    expect(isValidGame([21, 20], r15)).toBe(true);
  });

  it("without balance", () => {
    expect(isValidGame([21, 20], r21nb)).toBe(true);
    expect(isValidGame([22, 20], r21nb)).toBe(false);
    expect(isValidGame([20, 19], r21nb)).toBe(false);
  });

  it("rejects garbage", () => {
    expect(isValidGame([21, 21], r21)).toBe(false);
    expect(isValidGame([21, -1], r21)).toBe(false);
    expect(isValidGame([21.5, 3], r21)).toBe(false);
  });
});

describe("validateMatch", () => {
  it("two games: exactly two, draw allowed", () => {
    expect(validateMatch([[21, 10], [10, 21]], "two_games", r21)).toBeNull();
    expect(validateMatch([[21, 10]], "two_games", r21)).toEqual({ code: "count" });
  });

  it("best of three", () => {
    expect(validateMatch([[21, 10], [21, 15]], "best_of_three", r21)).toBeNull();
    expect(validateMatch([[21, 10], [15, 21]], "best_of_three", r21)).toEqual({ code: "count" });
    expect(validateMatch([[21, 10], [15, 21], [21, 19]], "best_of_three", r21)).toBeNull();
    expect(validateMatch([[21, 10], [21, 15], [21, 19]], "best_of_three", r21)).toEqual({ code: "count" });
  });

  it("points at the bad game", () => {
    expect(validateMatch([[21, 10], [21, 20]], "best_of_three", r21)).toEqual({ code: "game", index: 1 });
  });
});

describe("matchPoints", () => {
  it("3:0 for a clean win, 2:1 for a three-game win, 1:1 for a draw", () => {
    expect(matchPoints(2, 0)).toEqual([3, 0]);
    expect(matchPoints(0, 2)).toEqual([0, 3]);
    expect(matchPoints(2, 1)).toEqual([2, 1]);
    expect(matchPoints(1, 2)).toEqual([1, 2]);
    expect(matchPoints(1, 1)).toEqual([1, 1]);
  });
});

describe("outcome", () => {
  const m = { home_id: "A", away_id: "B", games: null, walkover_winner_id: null };
  it("unplayed", () => expect(outcome(m)).toBeNull());
  it("walkover", () =>
    expect(outcome({ ...m, walkover_winner_id: "B" })).toEqual({
      homeGames: 0,
      awayGames: 2,
      homePoints: 0,
      awayPoints: 3,
      homeShuttles: 0,
      awayShuttles: 0,
    }));
  it("played", () =>
    expect(outcome({ ...m, games: [[21, 15], [18, 21], [21, 19]] })).toEqual({
      homeGames: 2,
      awayGames: 1,
      homePoints: 2,
      awayPoints: 1,
      homeShuttles: 60,
      awayShuttles: 55,
    }));
});

describe("displayGames", () => {
  const m = { home_id: "A", away_id: "B", games: null, walkover_winner_id: null };
  it("walkover shows the match score", () => {
    expect(displayGames({ ...m, walkover_winner_id: "A" })).toEqual([[2, 0]]);
    expect(displayGames({ ...m, walkover_winner_id: "B" })).toEqual([[0, 2]]);
  });
  it("played games as entered", () => {
    expect(displayGames({ ...m, games: [[21, 15], [21, 19]] })).toEqual([[21, 15], [21, 19]]);
  });
});
