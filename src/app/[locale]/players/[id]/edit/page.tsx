import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getStaff, isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PLAYER_COLUMNS, type Player } from "@/lib/players";
import { updatePlayer } from "@/app/actions/players";
import { PlayerForm } from "@/components/PlayerForm";

export default async function EditPlayerPage({ params }: PageProps<"/[locale]/players/[id]/edit">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!isOwner(await getStaff())) redirect({ href: `/players/${id}`, locale });

  const supabase = await createClient();
  const { data } = await supabase.from("players").select(PLAYER_COLUMNS).eq("id", id).maybeSingle();
  if (!data) notFound();
  const t = await getTranslations("players");

  return (
    <section className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold">{t("editTitle")}</h1>
      <PlayerForm action={updatePlayer.bind(null, id)} player={data as Player} cancelHref={`/players/${id}`} />
    </section>
  );
}
