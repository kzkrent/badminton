export type Fixture<T> = { tour: number; position: number; home: T; away: T };

/**
 * Round-robin schedule (circle method). With an odd number of participants one rests each tour.
 * The second circle mirrors the first with home/away swapped; tours are numbered consecutively.
 */
export function roundRobin<T>(participants: T[], circles: 1 | 2 = 1): Fixture<T>[] {
  if (participants.length < 2) return [];
  const slots: (T | null)[] = [...participants];
  if (slots.length % 2) slots.push(null);

  const n = slots.length;
  const toursPerCircle = n - 1;
  const fixtures: Fixture<T>[] = [];
  const rotating = slots.slice(1);

  for (let r = 0; r < toursPerCircle; r++) {
    const order = [slots[0], ...rotating];
    let position = 0;
    for (let i = 0; i < n / 2; i++) {
      const a = order[i];
      const b = order[n - 1 - i];
      if (a === null || b === null) continue;
      // Alternate sides so the fixed slot doesn't always play at home.
      const swap = i === 0 ? r % 2 === 1 : i % 2 === 1;
      fixtures.push({ tour: r + 1, position: position++, home: swap ? b : a, away: swap ? a : b });
    }
    rotating.unshift(rotating.pop()!);
  }

  if (circles === 2) {
    const first = fixtures.length;
    for (let k = 0; k < first; k++) {
      const f = fixtures[k];
      fixtures.push({ tour: f.tour + toursPerCircle, position: f.position, home: f.away, away: f.home });
    }
  }
  return fixtures;
}

/** Participants not playing in the given tour. */
export function restingIn<T>(participants: T[], fixtures: Fixture<T>[], tour: number): T[] {
  const playing = new Set<T>();
  for (const f of fixtures) {
    if (f.tour === tour) {
      playing.add(f.home);
      playing.add(f.away);
    }
  }
  return participants.filter((p) => !playing.has(p));
}
