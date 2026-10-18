import { describe, expect, it } from "vitest";
import { validateLineup } from "./tournaments";

const m1 = { id: "m1", gender: "M" as const };
const m2 = { id: "m2", gender: "M" as const };
const f1 = { id: "f1", gender: "F" as const };
const f2 = { id: "f2", gender: "F" as const };

describe("validateLineup", () => {
  it("accepts correct lineups", () => {
    expect(validateLineup("M", [m1])).toBeNull();
    expect(validateLineup("F", [f1])).toBeNull();
    expect(validateLineup("MF", [m1, f1])).toBeNull();
    expect(validateLineup("MF", [f1, m1])).toBeNull();
    expect(validateLineup("MM", [m1, m2])).toBeNull();
    expect(validateLineup("FF", [f1, f2])).toBeNull();
  });

  it("rejects wrong genders", () => {
    expect(validateLineup("M", [f1])).toBe("gender");
    expect(validateLineup("MF", [m1, m2])).toBe("gender");
    expect(validateLineup("MM", [m1, f1])).toBe("gender");
    expect(validateLineup("FF", [f1, m1])).toBe("gender");
  });

  it("rejects wrong size and duplicates", () => {
    expect(validateLineup("M", [m1, m2])).toBe("size");
    expect(validateLineup("MM", [m1])).toBe("size");
    expect(validateLineup("MM", [m1, m1])).toBe("samePlayer");
  });
});
