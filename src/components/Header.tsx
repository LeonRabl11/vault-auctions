import Image from "next/image";
import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {Link} from "@/i18n/navigation";
import HeaderShell from "./HeaderShell";
import Nav from "./Nav";
import VerifyBanner from "./VerifyBanner";
import styles from "./Header.module.scss";
import logo from "../../public/logo.png";

export default async function Header() {
  const session = await auth.api.getSession({headers: await headers()});

  return (
    <HeaderShell>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <Image src={logo} alt="Vault" className={styles.logo} priority />
        </Link>
        <Nav isAuthed={Boolean(session)} />
      </div>
      {session && !session.user.emailVerified && (
        <VerifyBanner email={session.user.email} />
      )}
    </HeaderShell>
  );
}
