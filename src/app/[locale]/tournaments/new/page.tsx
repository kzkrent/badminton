import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { saveTournament } from "@/app/actions/tournaments";
import { TournamentForm } from "@/components/TournamentForm";
import { createClient } from "@/lib/supabase/server";
import { ORGANIZER_COLUMNS, type Organizer } from "@/lib/organizers";

export default async function NewTournamentPage({ params }: PageProps<"/[locale]/tournaments/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await getStaff();
  if (!staff) redirect({ href: "/login", locale });
  const t = await getTranslations("tournaments");
  const supabase = await createClient();
  const { data } = await supabase.from("organizers").select(ORGANIZER_COLUMNS).order("name");
  const organizers = (data ?? []) as Organizer[];

  return (
    <section className="max-w-3xl">
      <h1 className="mb-4 text-2xl font-semibold">{t("newTitle")}</h1>
      <TournamentForm
        action={saveTournament.bind(null, null)}
        canSetWeight={staff?.role === "owner"}
        organizers={organizers}
        defaultOrganizerId={staff?.organizer_id}
        cancelHref="/tournaments"
      />
    </section>
  );
}
