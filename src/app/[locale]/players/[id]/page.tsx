import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStaff, isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ageOn, fullName, PLAYER_COLUMNS, type Player } from "@/lib/players";
import { deletePlayer } from "@/app/actions/players";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ConfirmButton } from "@/components/ConfirmButton";

export default async function PlayerPage({ params }: PageProps<"/[locale]/players/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data } = await supabase.from("players").select(PLAYER_COLUMNS).eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as Player;

  const t = await getTranslations("players");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const owner = isOwner(await getStaff());
  const name = fullName(p, locale);

  const rows: [string, React.ReactNode][] = [
    [t("gender"), p.gender === "M" ? t("male") : t("female")],
    [
      t("birthDate"),
      p.birth_date &&
        `${format.dateTime(new Date(p.birth_date), { dateStyle: "long", timeZone: "UTC" })} (${t("age", { age: ageOn(p.birth_date) })})`,
    ],
    [t("club"), p.club],
    [t("rating"), p.rating],
  ];

  return (
    <section className="max-w-2xl">
      <Link href="/players" className="mb-4 inline-block text-sm text-muted hover:text-accent">
        ← {tc("back")}
      </Link>
      <div className="card p-6">
        <div className="mb-6 flex items-center gap-4">
          <PlayerAvatar photoPath={p.photo_path} name={name} size={96} />
          <div>
            <h1 className="text-2xl font-semibold">{name}</h1>
            {locale === "en" && p.first_name_en && (
              <p className="text-sm text-muted">{fullName(p, "ru")}</p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
          {rows
            .filter(([, v]) => v !== null && v !== "")
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>

        {p.achievements && (
          <div className="mt-6">
            <h2 className="mb-1 text-sm font-semibold text-muted">{t("achievements")}</h2>
            <p className="whitespace-pre-line text-sm">{p.achievements}</p>
          </div>
        )}

        {owner && (
          <div className="mt-6 flex gap-3 border-t border-border pt-4">
            <Link href={`/players/${p.id}/edit`} className="btn-secondary">
              {tc("edit")}
            </Link>
            <form action={deletePlayer.bind(null, p.id)}>
              <ConfirmButton message={t("deleteConfirm")} className="btn-danger">
                {tc("delete")}
              </ConfirmButton>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
