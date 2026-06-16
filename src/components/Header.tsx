import {headers} from "next/headers";
import {getTranslations} from "next-intl/server";
import {auth} from "@/lib/auth";
import {Link} from "@/i18n/navigation";
import HeaderShell from "./HeaderShell";
import Nav from "./Nav";
import VerifyBanner from "./VerifyBanner";
import styles from "./Header.module.scss";

export default async function Header() {
  const t = await getTranslations("Metadata");
  const session = await auth.api.getSession({headers: await headers()});

  return (
    <HeaderShell>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <span className={styles.mark} aria-hidden />
          <span className={styles.brandText}>{t("title")}</span>
        </Link>
        <Nav isAuthed={Boolean(session)} />
      </div>
      {session && !session.user.emailVerified && (
        <VerifyBanner email={session.user.email} />
      )}
    </HeaderShell>
  );
}
