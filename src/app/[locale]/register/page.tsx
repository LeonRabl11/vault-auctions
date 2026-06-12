import {getTranslations, setRequestLocale} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import RegisterForm from "@/components/RegisterForm";
import styles from "@/components/AuthForm.module.scss";

type Props = {
  params: Promise<{locale: string}>;
};

export default async function RegisterPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Auth");

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t("register.title")}</h1>
        <RegisterForm />
        <p className={styles.links}>
          {t("register.hasAccount")}{" "}
          <Link href="/login">{t("register.loginLink")}</Link>
        </p>
      </div>
    </main>
  );
}
