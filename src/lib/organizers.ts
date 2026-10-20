export type Organizer = {
  id: string;
  name: string;
  name_en: string | null;
  phone: string | null;
  whatsapp: string | null;
  telegram: string | null;
  line_id: string | null;
};

export const ORGANIZER_COLUMNS = "id, name, name_en, phone, whatsapp, telegram, line_id";

export const organizerName = (o: Organizer, locale: string) => (locale === "en" && o.name_en) || o.name;

const digits = (s: string) => s.replace(/\D/g, "");

export function phoneUrl(phone: string): string | null {
  const d = digits(phone);
  if (d.length < 7) return null;
  return `tel:${phone.trim().startsWith("+") ? "+" : ""}${d}`;
}

/** wa.me needs the full international number without "+" or leading zeros. */
export function whatsappUrl(value: string): string | null {
  if (/^https?:\/\//i.test(value)) return value;
  let d = digits(value);
  // Thai local numbers (0xx…) → +66
  if (d.startsWith("0") && d.length === 10) d = `66${d.slice(1)}`;
  return d.length >= 8 ? `https://wa.me/${d}` : null;
}

/** Accepts "@name", "name", "t.me/name" or a full URL. */
export function telegramUrl(value: string): string | null {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^(t\.me\/|telegram\.me\/)/i, "").replace(/^@/, "");
  return /^[A-Za-z0-9_]{4,}$/.test(handle) ? `https://t.me/${handle}` : null;
}

/** "@shop" is a LINE Official Account; anything else a personal LINE ID. */
export function lineUrl(value: string): string | null {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("@")) return `https://line.me/R/ti/p/${encodeURIComponent(v)}`;
  return /^[\w.-]{2,}$/.test(v) ? `https://line.me/ti/p/~${encodeURIComponent(v)}` : null;
}

export type ContactLink = { kind: "phone" | "whatsapp" | "telegram" | "line"; href: string };

export function organizerLinks(o: Organizer): ContactLink[] {
  const out: ContactLink[] = [];
  const push = (kind: ContactLink["kind"], href: string | null) => href && out.push({ kind, href });
  if (o.phone) push("phone", phoneUrl(o.phone));
  if (o.whatsapp) push("whatsapp", whatsappUrl(o.whatsapp));
  if (o.telegram) push("telegram", telegramUrl(o.telegram));
  if (o.line_id) push("line", lineUrl(o.line_id));
  return out;
}
