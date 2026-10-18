import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStaff, isOwner } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { LocaleSwitcher } from "./LocaleSwitcher";

export async function Header() {
  const t = await getTranslations("common");
  const staff = await getStaff();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold">
          🏸 {t("appName")}
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="hover:text-accent">
            {t("tournaments")}
          </Link>
          <Link href="/players" className="hover:text-accent">
            {t("players")}
          </Link>
          {isOwner(staff) && (
            <Link href="/staff" className="hover:text-accent">
              {t("staff")}
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <LocaleSwitcher />
          {staff ? (
            <>
              <span className="hidden text-muted sm:inline" title={staff.email}>
                {staff.role === "owner" ? t("roleOwner") : t("roleAdmin")}
              </span>
              <form action={signOut}>
                <button className="btn-secondary px-3 py-1.5">{t("logout")}</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-secondary px-3 py-1.5">
              {t("login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
