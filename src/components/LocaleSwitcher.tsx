"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex overflow-hidden rounded-lg border border-border">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          className={`cursor-pointer px-2 py-1 text-xs uppercase ${
            l === locale ? "bg-accent text-accent-contrast" : "hover:bg-background"
          }`}
          aria-pressed={l === locale}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
