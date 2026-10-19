import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { fullName, PLAYER_COLUMNS, type Player } from "@/lib/players";
import { lastTournamentChange, MIN_RANKED_MATCHES, RATING_CATEGORIES, type RatingCategory } from "@/lib/rating";
import { loadRatings } from "@/lib/rating-data";
import { PlayerAvatar } from "@/components/PlayerAvatar";

export default async function RatingsPage({ params, searchParams }: PageProps<"/[locale]/ratings">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { cat } = await searchParams;
  const category: RatingCategory = RATING_CATEGORIES.includes(cat as RatingCategory) ? (cat as RatingCategory) : "singles";

  const t = await getTranslations("ratings");
  const ratings = await loadRatings();
  const ranked = [...ratings[category].entries()]
    .filter(([, r]) => r.matches >= MIN_RANKED_MATCHES)
    .sort(([, a], [, b]) => b.rating - a.rating);

  const supabase = await createClient();
  const { data } = ranked.length
    ? await supabase.from("players").select(PLAYER_COLUMNS).in("id", ranked.map(([id]) => id))
    : { data: [] };
  const players = new Map(((data ?? []) as Player[]).map((p) => [p.id, p]));

  return (
    <section>
      <h1 className="mb-2 text-2xl font-semibold">{t("title")}</h1>
      <p className="mb-4 text-sm text-muted">{t("hint", { min: MIN_RANKED_MATCHES })}</p>

      <nav className="mb-4 flex gap-2">
        {RATING_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={{ pathname: "/ratings", query: { cat: c } }}
            className={`rounded-full border px-3 py-1 text-sm ${
              c === category ? "border-accent bg-accent text-accent-contrast" : "border-border bg-surface hover:border-accent"
            }`}
            aria-current={c === category ? "page" : undefined}
          >
            {t(`cat_${c}`)}
          </Link>
        ))}
      </nav>

      {ranked.length === 0 ? (
        <div className="card p-6 text-sm text-muted">{t("empty", { min: MIN_RANKED_MATCHES })}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="w-10 px-3 py-2 text-center font-medium">#</th>
                <th className="px-2 py-2 text-left font-medium">{t("player")}</th>
                <th className="px-2 py-2 text-right font-medium">{t("rating")}</th>
                <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">{t("matches")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("change")}</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(([id, r], i) => {
                const p = players.get(id);
                if (!p) return null;
                const name = fullName(p, locale);
                const change = Math.round(lastTournamentChange(r) ?? 0);
                return (
                  <tr key={id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-center text-muted tabular-nums">{i + 1}</td>
                    <td className="px-2 py-2">
                      <Link href={`/players/${id}`} className="flex min-w-0 items-center gap-2 hover:text-accent">
                        <PlayerAvatar photoPath={p.photo_path} name={name} size={28} />
                        <span className="truncate font-medium">{name}</span>
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{Math.round(r.rating)}</td>
                    <td className="hidden px-2 py-2 text-right text-muted tabular-nums sm:table-cell">{r.matches}</td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${
                        change > 0 ? "text-accent" : change < 0 ? "text-danger" : "text-muted"
                      }`}
                    >
                      {change > 0 ? `▲ ${change}` : change < 0 ? `▼ ${-change}` : "0"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
