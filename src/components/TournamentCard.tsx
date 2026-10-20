import Image from "next/image";
import { getFormatter } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GALLERY_BUCKET, photoUrl } from "@/lib/supabase/env";
import { tournamentName, type Tournament } from "@/lib/tournaments";
import { formatTournamentDates } from "@/lib/date-format";
import { StatusBadge, tournamentSummary } from "./TournamentHeader";

/** Card with cover, name, status, date and format; drafts open the manage page. */
export async function TournamentCard({
  tournament: x,
  locale,
  children,
}: {
  tournament: Tournament;
  locale: string;
  /** Extra content under the summary (announcement details, leader, …); may contain its own links. */
  children?: React.ReactNode;
}) {
  const format = await getFormatter();
  return (
    <div className="card flex h-full flex-col overflow-hidden hover:border-accent">
      <Link href={x.status === "draft" ? `/tournaments/${x.id}/manage` : `/tournaments/${x.id}`} className="block">
        {x.cover_path && (
          <div className="relative aspect-[16/7] bg-border">
            <Image src={photoUrl(x.cover_path, GALLERY_BUCKET)!} alt="" fill unoptimized className="object-cover" />
          </div>
        )}
        <div className="space-y-1 px-4 pt-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium hover:text-accent">{tournamentName(x, locale)}</span>
            <StatusBadge status={x.status} />
          </div>
          {x.starts_on && !children && (
            <div className="text-xs text-muted">
              {formatTournamentDates(format, x)}
            </div>
          )}
          <div className="text-xs text-muted">{await tournamentSummary(x)}</div>
        </div>
      </Link>
      {children ? <div className="px-4 pb-4">{children}</div> : <div className="pb-2" />}
    </div>
  );
}
