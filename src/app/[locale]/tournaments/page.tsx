import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TOURNAMENT_COLUMNS, type Tournament, type TournamentStatus } from "@/lib/tournaments";
import { TournamentCard } from "@/components/TournamentCard";

const SECTIONS: { status: TournamentStatus; key: "sectionActive" | "sectionAnnounced" | "sectionDraft" | "sectionFinished" }[] = [
  { status: "active", key: "sectionActive" },
  { status: "announced", key: "sectionAnnounced" },
  { status: "draft", key: "sectionDraft" },
  { status: "finished", key: "sectionFinished" },
];

export default async function TournamentsPage({ params }: PageProps<"/[locale]/tournaments">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tournaments");
  const tc = await getTranslations("common");
  const staff = await getStaff();

  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select(TOURNAMENT_COLUMNS)
    .order("starts_on", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });
  const tournaments = (data ?? []) as Tournament[];

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold">{tc("tournaments")}</h1>
        {staff && (
          <Link href="/tournaments/new" className="btn-primary">
            {t("create")}
          </Link>
        )}
      </div>

      {tournaments.length === 0 && <div className="card p-6 text-muted">{t("empty")}</div>}

      {SECTIONS.map(({ status, key }) => {
        const list = tournaments.filter((x) => x.status === status);
        if (list.length === 0) return null;
        return (
          <div key={status} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">{t(key)}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {list.map((x) => (
                <li key={x.id}>
                  <TournamentCard tournament={x} locale={locale} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
