import {getTranslations, setRequestLocale} from "next-intl/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import Nav from "@/components/Nav";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{locale: string}>;
};

export default async function Home({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  const t = await getTranslations("HomePage");

  return (
    <main className={styles.main}>
      <LocaleSwitcher />
      <Nav />
      <h1 className={styles.title}>{t("title")}</h1>
    </main>
  );
}
