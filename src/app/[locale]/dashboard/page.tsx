import {headers} from "next/headers";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {auth} from "@/lib/auth";
import {redirect} from "@/i18n/navigation";
import Nav from "@/components/Nav";
import styles from "@/components/AuthForm.module.scss";

type Props = {
  params: Promise<{locale: string}>;
};

export default async function DashboardPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  // Echte, serverseitige Session-Prüfung (Middleware ist nur optimistisch)
  const session = await auth.api.getSession({headers: await headers()});
  if (!session) {
    redirect({href: "/login", locale});
    return null;
  }

  const t = await getTranslations("Dashboard");

  return (
    <main className={styles.main}>
      <Nav />
      <div className={styles.card}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p>{t("welcome", {name: session.user.name})}</p>
      </div>
    </main>
  );
}
