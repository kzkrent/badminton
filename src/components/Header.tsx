import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStaff } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { NavLinks } from "./NavLinks";
import { BottomNav } from "./BottomNav";
import { UserIcon } from "./NavIcons";

export async function Header() {
  const t = await getTranslations("common");
  const staff = await getStaff();
  const role = staff?.role ?? null;

  return (
    <>
      <header className="sticky top-0 z-30 border-b print:hidden border-border bg-surface/95 backdrop-blur sm:static sm:bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:flex-wrap sm:py-3">
          <Link href="/" className="truncate font-semibold">
            🏸 {t("appNameShort")}
          </Link>
          <NavLinks role={role} />
          <div className="ml-auto flex shrink-0 items-center gap-3 text-sm">
            <LocaleSwitcher />
            {staff ? (
              <>
                <span className="hidden text-muted sm:inline" title={staff.email}>
                  {staff.role === "owner" ? t("roleOwner") : t("roleAdmin")}
                </span>
                {/* On phones sign-out lives in the bottom bar's "More" sheet. */}
                <form action={signOut} className="hidden sm:block">
                  <button className="btn-secondary px-3 py-1.5">{t("logout")}</button>
                </form>
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-contrast sm:hidden"
                  title={staff.role === "owner" ? t("roleOwner") : t("roleAdmin")}
                >
                  <UserIcon />
                </span>
              </>
            ) : (
              <Link href="/login" className="btn-secondary px-3 py-1.5" aria-label={t("login")}>
                <span className="hidden sm:inline">{t("login")}</span>
                <span className="sm:hidden">
                  <UserIcon />
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>
      <BottomNav role={role} />
    </>
  );
}
