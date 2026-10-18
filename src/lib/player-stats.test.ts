import { describe, expect, it } from "vitest";
import { addMatches, emptyRecord } from "./player-stats";
import type { MatchLike } from "./scoring";

const base = { games: null, walkover_winner_id: null };

describe("addMatches", () => {
  it("counts wins, losses, draws, walkovers and skips unplayed / foreign matches", () => {
    const matches: MatchLike[] = [
      { ...base, home_id: "A", away_id: "B", games: [[21, 10], [21, 12]] }, // win 2:0
      { ...base, home_id: "C", away_id: "A", games: [[21, 10], [10, 21], [21, 19]] }, // loss 1:2
      { ...base, home_id: "A", away_id: "D", games: [[21, 10], [10, 21]] }, // draw 1:1
      { ...base, home_id: "E", away_id: "A", walkover_winner_id: "A" }, // walkover win
      { ...base, home_id: "A", away_id: "F" }, // unplayed
      { ...base, home_id: "B", away_id: "C", games: [[21, 0], [21, 0]] }, // not A
    ];
    expect(addMatches(emptyRecord(), "A", matches, 21)).toEqual({
      played: 4,
      wins: 2,
      losses: 1,
      draws: 1,
      gamesWon: 2 + 1 + 1 + 2,
      gamesLost: 0 + 2 + 1 + 0,
    });
  });
});
