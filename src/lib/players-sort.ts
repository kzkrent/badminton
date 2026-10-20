import { firstName, lastName, type Player } from "./players";
import type { RatingCategory } from "./rating";

export type PlayerSort = "name" | "club" | `rating_${RatingCategory}`;
export const PLAYER_SORTS: PlayerSort[] = ["name", "rating_singles", "rating_doubles", "rating_mixed", "club"];

/**
 * Sorts in the page's language: surname, then first name (English falls back to Russian names).
 * Rating: highest first, players without matches in that category at the end. Club: A–Z, no club last.
 */
export function sortPlayers(
  players: Player[],
  sort: PlayerSort,
  locale: string,
  ratingOf: (id: string, category: RatingCategory) => number | null = () => null,
): Player[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  const byText = (a: string, b: string) => {
    if (!a !== !b) return a ? -1 : 1; // empty last
    return collator.compare(a, b);
  };
  const byName = (a: Player, b: Player) =>
    byText(lastName(a, locale), lastName(b, locale)) || byText(firstName(a, locale), firstName(b, locale));

  const list = [...players];
  if (sort === "club") return list.sort((a, b) => byText(a.club ?? "", b.club ?? "") || byName(a, b));
  if (sort.startsWith("rating_")) {
    const cat = sort.slice("rating_".length) as RatingCategory;
    return list.sort((a, b) => {
      const ra = ratingOf(a.id, cat);
      const rb = ratingOf(b.id, cat);
      if (ra === null || rb === null) return ra === rb ? byName(a, b) : ra === null ? 1 : -1;
      return rb - ra || byName(a, b);
    });
  }
  return list.sort(byName);
}
