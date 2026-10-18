export type Gender = "M" | "F";

export type Player = {
  id: string;
  first_name_ru: string;
  last_name_ru: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
  birth_date: string | null;
  gender: Gender;
  photo_path: string | null;
  club: string | null;
  rating: number | null;
  achievements: string | null;
};

export const PLAYER_COLUMNS =
  "id, first_name_ru, last_name_ru, first_name_en, last_name_en, birth_date, gender, photo_path, club, rating, achievements";

/** First name in the current locale; English falls back to Russian. */
export function firstName(p: Player, locale: string): string {
  return (locale === "en" && p.first_name_en) || p.first_name_ru;
}

export function lastName(p: Player, locale: string): string {
  return ((locale === "en" && p.first_name_en ? p.last_name_en : p.last_name_ru) ?? "").trim();
}

export function fullName(p: Player, locale: string): string {
  return [firstName(p, locale), lastName(p, locale)].filter(Boolean).join(" ");
}

export function ageOn(birthDate: string, today = new Date()): number {
  const b = new Date(birthDate);
  let age = today.getFullYear() - b.getFullYear();
  const beforeBirthday =
    today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate());
  if (beforeBirthday) age--;
  return age;
}
