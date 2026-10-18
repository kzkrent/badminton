import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getStaff, isOwner, type Staff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { removeAdmin } from "@/app/actions/staff";
import { AddAdminForm } from "./AddAdminForm";

export default async function StaffPage({ params }: PageProps<"/[locale]/staff">) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!isOwner(await getStaff())) redirect({ href: "/", locale });

  const t = await getTranslations("staff");
  const tc = await getTranslations("common");
  const supabase = await createClient();
  const { data } = await supabase.from("staff").select("email, role").order("role").order("email");
  const staff = (data ?? []) as Staff[];
  const admins = staff.filter((s) => s.role === "admin");

  return (
    <section className="max-w-xl">
      <h1 className="mb-2 text-2xl font-semibold">{t("title")}</h1>
      <p className="mb-6 text-sm text-muted">{t("hint")}</p>
      <AddAdminForm />
      <ul className="card mt-6 divide-y divide-border">
        {staff
          .filter((s) => s.role === "owner")
          .map((s) => (
            <li key={s.email} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{s.email}</span>
              <span className="text-muted">{tc("roleOwner")}</span>
            </li>
          ))}
        {admins.map((s) => (
          <li key={s.email} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{s.email}</span>
            <form action={removeAdmin}>
              <input type="hidden" name="email" value={s.email} />
              <button className="btn-danger px-3 py-1">{t("remove")}</button>
            </form>
          </li>
        ))}
        {admins.length === 0 && <li className="px-4 py-3 text-sm text-muted">{t("empty")}</li>}
      </ul>
    </section>
  );
}
