import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";
import styles from "../legal.module.scss";

type Props = {
  params: Promise<{locale: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Legal"});
  return {title: t("terms.title")};
}

export default async function TermsPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Legal");

  return (
    <article className={styles.page}>
      <span className={styles.badge}>{t("badge")}</span>
      <h1>{t("terms.title")}</h1>
      <p className={styles.note}>{t("placeholder")}</p>
    </article>
  );
}
