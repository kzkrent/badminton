import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TOURNAMENT_COLUMNS, tournamentName, type Tournament, type TournamentStatus } from "@/lib/tournaments";
import { StatusBadge, tournamentSummary } from "@/components/TournamentHeader";
import { GALLERY_BUCKET, photoUrl } from "@/lib/supabase/env";
import Image from "next/image";

const SECTIONS: { status: TournamentStatus; key: "sectionActive" | "sectionDraft" | "sectionFinished" }[] = [
  { status: "active", key: "sectionActive" },
  { status: "draft", key: "sectionDraft" },
  { status: "finished", key: "sectionFinished" },
];

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tournaments");
  const th = await getTranslations("home");
  const format = await getFormatter();
  const staff = await getStaff();

  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select(TOURNAMENT_COLUMNS)
    .order("starts_on", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });
  const tournaments = (data ?? []) as Tournament[];
  const summaries = new Map(await Promise.all(tournaments.map(async (x) => [x.id, await tournamentSummary(x)] as const)));

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold">{th("title")}</h1>
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
                  <Link
                    href={x.status === "draft" ? `/tournaments/${x.id}/manage` : `/tournaments/${x.id}`}
                    className="card block overflow-hidden hover:border-accent"
                  >
                    {x.cover_path && (
                      <div className="relative aspect-[16/7] bg-border">
                        <Image src={photoUrl(x.cover_path, GALLERY_BUCKET)!} alt="" fill unoptimized className="object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-medium">{tournamentName(x, locale)}</span>
                        <StatusBadge status={x.status} />
                      </div>
                      {x.starts_on && (
                        <div className="text-xs text-muted">
                          {format.dateTime(new Date(x.starts_on), { dateStyle: "medium", timeZone: "UTC" })}
                        </div>
                      )}
                      <div className="text-xs text-muted">{summaries.get(x.id)}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
