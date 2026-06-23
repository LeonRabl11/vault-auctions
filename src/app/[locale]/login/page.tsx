import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import LoginForm from "@/components/LoginForm";
import styles from "@/components/AuthForm.module.scss";

type Props = {
  params: Promise<{locale: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Auth"});
  return {title: t("login.title")};
}

export default async function LoginPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Auth");

  return (
    <div className={styles.auth}>
      <h1 className={styles.title}>{t("login.title")}</h1>
      <div className="card">
        <LoginForm />
      </div>
      <p className={styles.links}>
        {t("login.noAccount")}{" "}
        <Link href="/register">{t("login.registerLink")}</Link>
      </p>
    </div>
  );
}
