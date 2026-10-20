export type Partner = {
  id: string;
  name: string;
  name_en: string | null;
  url: string | null;
  description_ru: string | null;
  description_en: string | null;
  logo_path: string | null;
  sort: number;
};

export const PARTNER_COLUMNS = "id, name, name_en, url, description_ru, description_en, logo_path, sort";

export const partnerName = (p: Partner, locale: string) => (locale === "en" && p.name_en) || p.name;

export const partnerDescription = (p: Partner, locale: string) =>
  (locale === "en" ? p.description_en || p.description_ru : p.description_ru || p.description_en) ?? "";
