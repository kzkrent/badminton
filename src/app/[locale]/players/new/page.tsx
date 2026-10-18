import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { createPlayer } from "@/app/actions/players";
import { PlayerForm } from "@/components/PlayerForm";

export default async function NewPlayerPage({ params }: PageProps<"/[locale]/players/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await getStaff())) redirect({ href: "/login", locale });
  const t = await getTranslations("players");

  return (
    <section className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold">{t("newTitle")}</h1>
      <PlayerForm action={createPlayer} cancelHref="/players" />
    </section>
  );
}
