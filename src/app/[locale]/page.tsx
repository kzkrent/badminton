import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold">{t("title")}</h1>
      <div className="card p-6 text-muted">{t("soon")}</div>
    </section>
  );
}
