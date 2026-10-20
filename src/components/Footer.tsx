import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { GALLERY_BUCKET, photoUrl } from "@/lib/supabase/env";
import { PARTNER_COLUMNS, partnerName, type Partner } from "@/lib/partners";

/** Site-wide strip of partner logos; hidden until there is at least one partner. */
export async function Footer() {
  const supabase = await createClient();
  const { data } = await supabase.from("partners").select(PARTNER_COLUMNS).order("sort").order("created_at");
  const partners = (data ?? []) as Partner[];
  if (partners.length === 0) return null;

  const t = await getTranslations("partners");
  const locale = await getLocale();

  return (
    <footer className="mt-8 border-t border-border bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Link href="/partners" className="mb-4 block text-center text-xs font-semibold tracking-wide text-muted uppercase hover:text-accent">
          {t("title")}
        </Link>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {partners.map((p) => {
            const name = partnerName(p, locale);
            const logo = photoUrl(p.logo_path, GALLERY_BUCKET);
            const content = logo ? (
              <span className="flex h-12 items-center rounded-md bg-white px-2">
                <Image src={logo} alt={name} width={120} height={40} unoptimized className="max-h-10 w-auto object-contain" />
              </span>
            ) : (
              <span className="text-sm font-medium">{name}</span>
            );
            return (
              <li key={p.id}>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noopener" title={name} className="opacity-90 hover:opacity-100">
                    {content}
                  </a>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </footer>
  );
}
