import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fullName, PLAYER_COLUMNS, type Player } from "@/lib/players";
import { PlayerAvatar } from "@/components/PlayerAvatar";

export default async function PlayersPage({ params, searchParams }: PageProps<"/[locale]/players">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q } = await searchParams;
  const query = (typeof q === "string" ? q : "").replace(/[,()%*]/g, " ").trim();

  const t = await getTranslations("players");
  const staff = await getStaff();
  const supabase = await createClient();

  let request = supabase.from("players").select(PLAYER_COLUMNS).order("last_name_ru").order("first_name_ru");
  if (query) {
    const like = `%${query}%`;
    request = request.or(
      ["first_name_ru", "last_name_ru", "first_name_en", "last_name_en", "club"].map((c) => `${c}.ilike.${like}`).join(","),
    );
  }
  const { data } = await request;
  const players = (data ?? []) as Player[];

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold">{t("title")}</h1>
        <form className="w-full sm:w-64">
          <input name="q" defaultValue={query} placeholder={t("search")} className="input" type="search" />
        </form>
        {staff && (
          <Link href="/players/new" className="btn-primary">
            {t("add")}
          </Link>
        )}
      </div>

      {players.length === 0 ? (
        <div className="card p-6 text-muted">{t("empty")}</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => {
            const name = fullName(p, locale);
            return (
              <li key={p.id}>
                <Link href={`/players/${p.id}`} className="card flex items-center gap-3 p-3 hover:border-accent">
                  <PlayerAvatar photoPath={p.photo_path} name={name} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{name}</div>
                    <div className="truncate text-xs text-muted">
                      {[p.gender === "M" ? t("male") : t("female"), p.club].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {p.rating !== null && <span className="text-sm font-semibold text-accent">{p.rating}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
