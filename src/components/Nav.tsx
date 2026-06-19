"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Link, usePathname} from "@/i18n/navigation";
import LogoutButton from "./LogoutButton";
import LocaleSwitcher from "./LocaleSwitcher";
import styles from "./Nav.module.scss";

type Props = {
  isAuthed: boolean;
};

export default function Nav({isAuthed}: Props) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Primäre Navigation (zusätzliche Links nur für eingeloggte Nutzer)
  const links = [
    {href: "/marktplatz", label: t("auctions")},
    ...(isAuthed
      ? [
          {href: "/marktplatz/new", label: t("createAuction")},
          {href: "/dashboard", label: t("dashboard")},
        ]
      : []),
  ];

  // Aktiver Link = längster passender Prefix (so ist /marktplatz/new eindeutig
  // aktiv, nicht zugleich /marktplatz).
  const activeHref = links
    .map((l) => l.href)
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className={styles.burger}
        aria-expanded={open}
        aria-controls="main-menu"
        aria-label={t("menu")}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          {open ? (
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M3 6h18M3 12h18M3 18h18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>

      <div id="main-menu" className={`${styles.menu} ${open ? styles.open : ""}`}>
        <ul className={styles.links}>
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`${styles.link} ${
                  l.href === activeHref ? styles.active : ""
                }`}
                aria-current={l.href === activeHref ? "page" : undefined}
                onClick={close}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          {isAuthed ? (
            <LogoutButton />
          ) : (
            <>
              <Link href="/login" className={styles.link} onClick={close}>
                {t("login")}
              </Link>
              <Link
                href="/register"
                className="btn btn--primary"
                onClick={close}
              >
                {t("register")}
              </Link>
            </>
          )}
          <LocaleSwitcher />
        </div>
      </div>
    </>
  );
}
