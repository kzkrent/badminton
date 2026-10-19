import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { saveTournament } from "@/app/actions/tournaments";
import { TournamentForm } from "@/components/TournamentForm";

export default async function NewTournamentPage({ params }: PageProps<"/[locale]/tournaments/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await getStaff();
  if (!staff) redirect({ href: "/login", locale });
  const t = await getTranslations("tournaments");

  return (
    <section className="max-w-3xl">
      <h1 className="mb-4 text-2xl font-semibold">{t("newTitle")}</h1>
      <TournamentForm action={saveTournament.bind(null, null)} canSetWeight={staff?.role === "owner"} cancelHref="/" />
    </section>
  );
}
