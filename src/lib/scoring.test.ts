import { describe, expect, it } from "vitest";
import { isValidGame, outcome, validateMatch, type GameRules } from "./scoring";

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

describe("outcome", () => {
  const m = { home_id: "A", away_id: "B", games: null, walkover_winner_id: null };
  it("unplayed", () => expect(outcome(m, 21)).toBeNull());
  it("walkover", () =>
    expect(outcome({ ...m, walkover_winner_id: "B" }, 21)).toEqual({
      homeGames: 0,
      awayGames: 2,
      homeShuttles: 0,
      awayShuttles: 42,
    }));
  it("played", () =>
    expect(outcome({ ...m, games: [[21, 15], [18, 21], [21, 19]] }, 21)).toEqual({
      homeGames: 2,
      awayGames: 1,
      homeShuttles: 60,
      awayShuttles: 55,
    }));
});
