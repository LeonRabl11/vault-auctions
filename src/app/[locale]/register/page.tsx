import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import RegisterForm from "@/components/RegisterForm";
import styles from "@/components/AuthForm.module.scss";

type Props = {
  params: Promise<{locale: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Auth"});
  return {title: t("register.title")};
}

export default async function RegisterPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Auth");

  return (
    <div className={styles.auth}>
      <h1 className={styles.title}>{t("register.title")}</h1>
      <div className="card">
        <RegisterForm />
      </div>
      <p className={styles.links}>
        {t("register.hasAccount")}{" "}
        <Link href="/login">{t("register.loginLink")}</Link>
      </p>
    </div>
  );
}
