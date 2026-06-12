import {headers} from "next/headers";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {auth} from "@/lib/auth";
import {redirect} from "@/i18n/navigation";
import styles from "./page.module.scss";

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
    <div className={styles.page}>
      <h1>{t("title")}</h1>
      <div className="card">
        <p>{t("welcome", {name: session.user.name})}</p>
      </div>
    </div>
  );
}
