import {getTranslations, setRequestLocale} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import LoginForm from "@/components/LoginForm";
import styles from "@/components/AuthForm.module.scss";

type Props = {
  params: Promise<{locale: string}>;
};

export default async function LoginPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Auth");

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t("login.title")}</h1>
        <LoginForm />
        <p className={styles.links}>
          {t("login.noAccount")}{" "}
          <Link href="/register">{t("login.registerLink")}</Link>
        </p>
      </div>
    </main>
  );
}
