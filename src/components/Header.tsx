import {getTranslations} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";
import Nav from "./Nav";
import styles from "./Header.module.scss";

export default async function Header() {
  const t = await getTranslations("Metadata");

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          {t("title")}
        </Link>
        <div className={styles.actions}>
          <Nav />
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
