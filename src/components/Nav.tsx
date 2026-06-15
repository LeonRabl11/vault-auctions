import {headers} from "next/headers";
import {getTranslations} from "next-intl/server";
import {auth} from "@/lib/auth";
import {Link} from "@/i18n/navigation";
import LogoutButton from "./LogoutButton";
import styles from "./Nav.module.scss";

export default async function Nav() {
  const t = await getTranslations("Nav");
  const session = await auth.api.getSession({headers: await headers()});

  return (
    <nav className={styles.nav}>
      <Link className={styles.link} href="/auctions">
        {t("auctions")}
      </Link>
      {session ? (
        <>
          <Link className={styles.link} href="/auctions/new">
            {t("createAuction")}
          </Link>
          <Link className={styles.link} href="/dashboard">
            {t("dashboard")}
          </Link>
          <LogoutButton />
        </>
      ) : (
        <>
          <Link className={styles.link} href="/login">
            {t("login")}
          </Link>
          <Link className={styles.link} href="/register">
            {t("register")}
          </Link>
        </>
      )}
    </nav>
  );
}
