import { describe, expect, it } from "vitest";
import type { Player } from "./players";
import { sortPlayers } from "./players-sort";

const p = (id: string, ru: [string, string | null], en: [string, string] | null, club: string | null = null): Player => ({
  id,
  first_name_ru: ru[0],
  last_name_ru: ru[1],
  first_name_en: en?.[0] ?? null,
  last_name_en: en?.[1] ?? null,
  birth_date: null,
  gender: "M",
  photo_path: null,
  club,
  rating: null,
  achievements: null,
});

const ivanov = p("i", ["Иван", "Иванов"], ["Ivan", "Ivanov"], "Samui");
const smirnov = p("s", ["Пётр", "Смирнов"], ["Petr", "Smirnov"]);
const abramov = p("a", ["Олег", "Абрамов"], ["Oleg", "Abramov"], "Bophut");
const noSurname = p("n", ["Катя", null], null);

const ids = (list: Player[]) => list.map((x) => x.id);

describe("sortPlayers", () => {
  it("by Russian surname on the Russian site, empty surname last", () => {
    expect(ids(sortPlayers([smirnov, noSurname, ivanov, abramov], "name", "ru"))).toEqual(["a", "i", "s", "n"]);
  });

  it("by English surname on the English site", () => {
    const yuri = p("y", ["Юрий", "Юдин"], ["Yuri", "Adams"]);
    expect(ids(sortPlayers([ivanov, yuri, abramov], "name", "en"))).toEqual(["a", "y", "i"]);
    expect(ids(sortPlayers([ivanov, yuri, abramov], "name", "ru"))).toEqual(["a", "i", "y"]);
  });

  it("by club, no club last", () => {
    expect(ids(sortPlayers([smirnov, ivanov, abramov], "club", "ru"))).toEqual(["a", "i", "s"]);
  });

  it("by rating, highest first, unrated last", () => {
    const ratings: Record<string, number> = { i: 1550, a: 1480 };
    const ratingOf = (id: string) => ratings[id] ?? null;
    expect(ids(sortPlayers([abramov, smirnov, ivanov], "rating_mixed", "ru", ratingOf))).toEqual(["i", "a", "s"]);
  });
});
