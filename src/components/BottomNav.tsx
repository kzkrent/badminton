"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { signOut } from "@/app/actions/auth";
import { HomeIcon, MoreIcon, PlayersIcon, RatingIcon, TrophyIcon } from "./NavIcons";
import { isActive, NAV_ITEMS, type NavRole } from "./NavLinks";

const TABS = [
  { href: "/", key: "home", Icon: HomeIcon },
  { href: "/tournaments", key: "tournaments", Icon: TrophyIcon },
  { href: "/players", key: "players", Icon: PlayersIcon },
  { href: "/ratings", key: "ratings", Icon: RatingIcon },
] as const;

/** Phone-only tab bar fixed to the bottom; "More" opens a sheet with the remaining sections. */
export function BottomNav({ role }: { role: NavRole }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const tabHrefs: string[] = TABS.map((x) => x.href);
  const more = NAV_ITEMS.filter((i) => !tabHrefs.includes(i.href) && (!i.show || i.show(role)));
  const moreActive = more.some((i) => isActive(pathname, i.href));

  const tabClass = (active: boolean) =>
    `flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] ${active ? "text-accent" : "text-muted"}`;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 sm:hidden" onClick={() => setOpen(false)} aria-hidden />
      )}
      {open && (
        <div
          role="dialog"
          aria-label={t("more")}
          className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-50 rounded-t-2xl border-t border-border bg-surface p-2 shadow-lg sm:hidden"
        >
          <ul>
            {more.map((i) => {
              const active = isActive(pathname, i.href);
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg px-4 py-3 text-base ${active ? "bg-background font-semibold text-accent" : ""}`}
                  >
                    {t(i.key)}
                  </Link>
                </li>
              );
            })}
            <li className="mt-1 border-t border-border pt-1">
              {role ? (
                <form action={signOut}>
                  <button className="block w-full cursor-pointer rounded-lg px-4 py-3 text-left text-base text-danger">
                    {t("logout")}
                  </button>
                </form>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 text-base">
                  {t("login")}
                </Link>
              )}
            </li>
          </ul>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        aria-label={t("menu")}
      >
        <div className="flex">
          {TABS.map(({ href, key, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={tabClass(active)}
              >
                <Icon />
                {t(key)}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={`${tabClass(open || moreActive)} cursor-pointer`}
          >
            <MoreIcon />
            {t("more")}
          </button>
        </div>
      </nav>
    </>
  );
}
