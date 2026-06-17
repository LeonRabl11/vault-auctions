import Image from "next/image";
import {getTranslations} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import logo from "../../public/logo.png";
import styles from "./Footer.module.scss";

export default async function Footer() {
  const t = await getTranslations("Footer");
  const year = new Date().getFullYear();

  const groups = [
    {
      title: t("platform.title"),
      links: [
        {href: "/auctions", label: t("platform.auctions")},
        {href: "/auctions/new", label: t("platform.createAuction")},
        {href: "/dashboard", label: t("platform.dashboard")},
      ],
    },
    {
      title: t("legal.title"),
      links: [
        {href: "/impressum", label: t("legal.imprint")},
        {href: "/datenschutz", label: t("legal.privacy")},
        {href: "/agb", label: t("legal.terms")},
      ],
    },
  ];

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Link href="/" className={styles.brandLink}>
            <Image src={logo} alt="Vault" className={styles.logo} />
          </Link>
          <p className={styles.copy}>© {year} Vault</p>
        </div>
        <nav className={styles.groups}>
          {groups.map((group) => (
            <div key={group.title} className={styles.group}>
              <h2 className={styles.groupTitle}>{group.title}</h2>
              <ul className={styles.links}>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={styles.link}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}
