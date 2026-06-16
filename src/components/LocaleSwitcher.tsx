"use client";

import {useLocale, useTranslations} from "next-intl";
import {usePathname, useRouter} from "@/i18n/navigation";
import {routing} from "@/i18n/routing";
import styles from "./LocaleSwitcher.module.scss";

// Kleine Inline-SVG-Flaggen (keine Emoji-Flaggen – auf Windows nicht darstellbar).
const FLAGS: Record<string, React.ReactNode> = {
  de: (
    <svg viewBox="0 0 5 3" className={styles.flag} aria-hidden>
      <rect width="5" height="3" fill="#000000" />
      <rect y="1" width="5" height="1" fill="#dd0000" />
      <rect y="2" width="5" height="1" fill="#ffce00" />
    </svg>
  ),
  en: (
    <svg viewBox="0 0 60 30" className={styles.flag} aria-hidden>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0 L60 30 M60 0 L0 30" stroke="#ffffff" strokeWidth="6" />
      <path d="M0 0 L60 30 M60 0 L0 30" stroke="#c8102e" strokeWidth="4" />
      <path d="M30 0 V30 M0 15 H60" stroke="#ffffff" strokeWidth="10" />
      <path d="M30 0 V30 M0 15 H60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  ),
};

export default function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className={styles.switcher} role="group" aria-label={t("label")}>
      {routing.locales.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            className={`${styles.option} ${active ? styles.active : ""}`}
            aria-current={active ? "true" : undefined}
            aria-label={t("locale", {locale: loc})}
            // Gleiche Seite, andere Sprache — Prefix wird automatisch gesetzt
            onClick={() => router.replace(pathname, {locale: loc})}
          >
            {FLAGS[loc]}
            <span>{loc.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
