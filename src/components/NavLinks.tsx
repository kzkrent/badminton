"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export type NavRole = "owner" | "admin" | null;

type Item = { href: string; key: string; show?: (role: NavRole) => boolean };

/** Every section, in menu order. */
export const NAV_ITEMS: Item[] = [
  { href: "/tournaments", key: "tournaments" },
  { href: "/players", key: "players" },
  { href: "/ratings", key: "ratings" },
  { href: "/partners", key: "partners" },
  { href: "/organizers", key: "organizers", show: (r) => r !== null },
  { href: "/staff", key: "staff", show: (r) => r === "owner" },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop menu (hidden on phones, where the bottom bar takes over). */
export function NavLinks({ role }: { role: NavRole }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  return (
    <nav className="hidden flex-wrap gap-x-4 gap-y-1 text-sm sm:flex">
      {NAV_ITEMS.filter((i) => !i.show || i.show(role)).map((i) => {
        const active = isActive(pathname, i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={active ? "font-semibold text-accent" : "hover:text-accent"}
          >
            {t(i.key)}
          </Link>
        );
      })}
    </nav>
  );
}
