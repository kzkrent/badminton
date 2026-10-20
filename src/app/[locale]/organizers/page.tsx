import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getStaff, isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ORGANIZER_COLUMNS, organizerName, type Organizer } from "@/lib/organizers";
import { ContactButtons } from "@/components/ContactButtons";
import { AddOrganizer, CreateMyProfile, OrganizerControls } from "@/components/OrganizerEditor";

/** Staff-only: your own organizer profile; the owner manages every profile. */
export default async function OrganizersPage({ params }: PageProps<"/[locale]/organizers">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await getStaff();
  if (!staff) redirect({ href: "/login", locale });
  const owner = isOwner(staff);
  const t = await getTranslations("organizers");

  const supabase = await createClient();
  const { data } = await supabase.from("organizers").select(ORGANIZER_COLUMNS).order("name");
  const organizers = (data ?? []) as Organizer[];
  const mine = organizers.find((o) => o.id === staff?.organizer_id);
  const others = organizers.filter((o) => o.id !== staff?.organizer_id);

  const card = (o: Organizer, isMine: boolean) => (
    <li key={o.id} className="card space-y-3 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{organizerName(o, locale)}</h3>
        {isMine && <span className="text-xs text-accent">{t("you")}</span>}
      </div>
      <ContactButtons organizer={o} />
      {(isMine || owner) && <OrganizerControls organizer={o} canDelete={owner} />}
    </li>
  );

  return (
    <section className="space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted">{t("intro")}</p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("mine")}</h2>
        {mine ? (
          <ul>{card(mine, true)}</ul>
        ) : (
          <div className="card flex flex-wrap items-center gap-3 p-4">
            <p className="mr-auto text-sm text-muted">{t("noMine")}</p>
            <CreateMyProfile />
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-lg font-semibold">{t("all")}</h2>
          {owner && <AddOrganizer />}
        </div>
        {others.length === 0 ? (
          <p className="text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">{others.map((o) => card(o, false))}</ul>
        )}
      </div>
    </section>
  );
}
