import { useTranslations } from "next-intl";
import { organizerLinks, type ContactLink, type Organizer } from "@/lib/organizers";

const STYLE: Record<ContactLink["kind"], string> = {
  phone: "bg-neutral-700 text-white",
  whatsapp: "bg-[#1f8f4e] text-white",
  telegram: "bg-[#1d7fbf] text-white",
  line: "bg-[#06a14a] text-white",
};

const ICON: Record<ContactLink["kind"], string> = { phone: "📞", whatsapp: "💬", telegram: "✈️", line: "💚" };

/** One button per filled contact of an organizer. */
export function ContactButtons({ organizer }: { organizer: Organizer }) {
  const t = useTranslations("organizers");
  const links = organizerLinks(organizer);
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a
          key={l.kind}
          href={l.href}
          target={l.kind === "phone" ? undefined : "_blank"}
          rel="noopener"
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium hover:opacity-90 ${STYLE[l.kind]}`}
        >
          <span aria-hidden>{ICON[l.kind]}</span>
          {t(`btn_${l.kind}`)}
        </a>
      ))}
    </div>
  );
}
