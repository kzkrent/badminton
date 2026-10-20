import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getStaff, isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GALLERY_BUCKET, photoUrl } from "@/lib/supabase/env";
import { PARTNER_COLUMNS, partnerDescription, partnerName, type Partner } from "@/lib/partners";
import { AddPartner, EditPartner } from "@/components/PartnersManager";

export default async function PartnersPage({ params }: PageProps<"/[locale]/partners">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("partners");
  const owner = isOwner(await getStaff());

  const supabase = await createClient();
  const { data } = await supabase.from("partners").select(PARTNER_COLUMNS).order("sort").order("created_at");
  const partners = (data ?? []) as Partner[];

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold">{t("title")}</h1>
        {owner && <AddPartner />}
      </div>
      <p className="mb-6 text-sm text-muted">{t("intro")}</p>

      {partners.length === 0 ? (
        <div className="card p-6 text-sm text-muted">{t("empty")}</div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => {
            const name = partnerName(p, locale);
            const logo = photoUrl(p.logo_path, GALLERY_BUCKET);
            const description = partnerDescription(p, locale);
            return (
              <li key={p.id} className="card flex flex-col p-4">
                <div className="mb-3 flex h-28 items-center justify-center rounded-lg bg-white p-3">
                  {logo ? (
                    <Image src={logo} alt={name} width={240} height={96} unoptimized className="max-h-full w-auto object-contain" />
                  ) : (
                    <span className="text-lg font-semibold text-neutral-700">{name}</span>
                  )}
                </div>
                <h2 className="font-semibold">{name}</h2>
                {description && <p className="mt-1 text-sm whitespace-pre-line text-muted">{description}</p>}
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener" className="mt-2 text-sm text-accent hover:underline">
                    {t("visit")} →
                  </a>
                )}
                {owner && <EditPartner partner={p} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
