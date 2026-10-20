import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PLAYER_COLUMNS, surnameFirst, type Player } from "@/lib/players";
import { PLAYER_SORTS, sortPlayers, type PlayerSort } from "@/lib/players-sort";
import { loadRatings } from "@/lib/rating-data";
import type { RatingCategory } from "@/lib/rating";
import { PlayerAvatar } from "@/components/PlayerAvatar";

const GENDERS = ["all", "M", "F"] as const;
type GenderFilter = (typeof GENDERS)[number];

export default async function PlayersPage({ params, searchParams }: PageProps<"/[locale]/players">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const query = (typeof sp.q === "string" ? sp.q : "").replace(/[,()%*]/g, " ").trim();
  const sort: PlayerSort = PLAYER_SORTS.includes(sp.sort as PlayerSort) ? (sp.sort as PlayerSort) : "name";
  const gender: GenderFilter = sp.g === "M" || sp.g === "F" ? sp.g : "all";

  const t = await getTranslations("players");
  const staff = await getStaff();
  const supabase = await createClient();

  let request = supabase.from("players").select(PLAYER_COLUMNS);
  if (gender !== "all") request = request.eq("gender", gender);
  if (query) {
    const like = `%${query}%`;
    request = request.or(
      ["first_name_ru", "last_name_ru", "first_name_en", "last_name_en", "club"].map((c) => `${c}.ilike.${like}`).join(","),
    );
  }
  const { data } = await request;

  const ratingCategory = sort.startsWith("rating_") ? (sort.slice(7) as RatingCategory) : null;
  const ratings = ratingCategory ? await loadRatings() : null;
  const ratingOf = (id: string, cat: RatingCategory) => {
    const r = ratings?.[cat].get(id);
    return r ? r.rating : null;
  };
  const players = sortPlayers((data ?? []) as Player[], sort, locale, ratingOf);

  // Links keep the other filters.
  const href = (patch: Record<string, string | null>) => {
    const next = { q: query || null, sort: sort === "name" ? null : sort, g: gender === "all" ? null : gender, ...patch };
    const queryParams = Object.fromEntries(Object.entries(next).filter(([, v]) => v)) as Record<string, string>;
    return { pathname: "/players" as const, query: queryParams };
  };
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${
      active ? "border-accent bg-accent text-accent-contrast" : "border-border bg-surface hover:border-accent"
    }`;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold">{t("title")}</h1>
        <form className="w-full sm:w-64">
          <input name="q" defaultValue={query} placeholder={t("search")} className="input" type="search" />
          {sort !== "name" && <input type="hidden" name="sort" value={sort} />}
          {gender !== "all" && <input type="hidden" name="g" value={gender} />}
        </form>
        {staff && (
          <Link href="/players/new" className="btn-primary">
            {t("add")}
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("sortBy")}>
          <span className="text-xs text-muted">{t("sortBy")}:</span>
          {PLAYER_SORTS.map((s) => (
            <Link key={s} href={href({ sort: s === "name" ? null : s })} className={chip(sort === s)} aria-current={sort === s || undefined}>
              {t(`sort_${s}`)}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("gender")}>
          <span className="text-xs text-muted">{t("gender")}:</span>
          {GENDERS.map((g) => (
            <Link key={g} href={href({ g: g === "all" ? null : g })} className={chip(gender === g)} aria-current={gender === g || undefined}>
              {g === "all" ? t("allGenders") : g === "M" ? t("male") : t("female")}
            </Link>
          ))}
        </div>
      </div>

      {players.length === 0 ? (
        <div className="card p-6 text-muted">{t("empty")}</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => {
            const name = surnameFirst(p, locale);
            const rating = ratingCategory ? ratingOf(p.id, ratingCategory) : null;
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
                  {ratingCategory && (
                    <span className={`text-sm font-semibold tabular-nums ${rating === null ? "text-muted" : "text-accent"}`}>
                      {rating === null ? "—" : Math.round(rating)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
