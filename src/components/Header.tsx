import {headers} from "next/headers";
import {getTranslations} from "next-intl/server";
import {auth} from "@/lib/auth";
import {Link} from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";
import Nav from "./Nav";
import VerifyBanner from "./VerifyBanner";
import styles from "./Header.module.scss";

export default async function Header() {
  const t = await getTranslations("Metadata");
  const session = await auth.api.getSession({headers: await headers()});

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
      {session && !session.user.emailVerified && (
        <VerifyBanner email={session.user.email} />
      )}
    </header>
  );
}
