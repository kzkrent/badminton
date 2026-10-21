/** Group letter for display: 1 → "A". */
export const groupLetter = (n: number) => String.fromCharCode(64 + n);

/**
 * Snake distribution of an ordered list into `groups` groups (1-based numbers):
 * 1→A, 2→B, 3→C, 4→C, 5→B, 6→A, 7→A … — group sizes differ by at most one.
 */
export function snakeGroups<T>(ordered: T[], groups: number): Map<T, number> {
  const out = new Map<T, number>();
  ordered.forEach((item, i) => {
    const row = Math.floor(i / groups);
    const col = i % groups;
    out.set(item, (row % 2 === 0 ? col : groups - 1 - col) + 1);
  });
  return out;
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type GroupSetupError = "tooFewParticipants" | "groupTooSmall" | "unassigned" | "advanceTooMany";

/** Checks a finished assignment: every participant in 1..groups, ≥2 per group, advance ≤ smallest group. */
export function validateGroups(
  assignment: Map<string, number | null>,
  groups: number,
  advance: number,
): GroupSetupError | null {
  if (assignment.size < groups * 2) return "tooFewParticipants";
  const sizes = Array.from({ length: groups }, () => 0);
  for (const g of assignment.values()) {
    if (!g || g < 1 || g > groups) return "unassigned";
    sizes[g - 1]++;
  }
  if (sizes.some((n) => n < 2)) return "groupTooSmall";
  if (advance > Math.min(...sizes)) return "advanceTooMany";
  return null;
}
