import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error } = await searchParams;
  const t = await getTranslations("login");

  return (
    <section className="mx-auto max-w-sm">
      <h1 className="mb-2 text-2xl font-semibold">{t("title")}</h1>
      <p className="mb-6 text-sm text-muted">{t("hint")}</p>
      {error && <p className="mb-4 text-sm text-danger">{t("callbackError")}</p>}
      <LoginForm />
    </section>
  );
}
