"use client";

import {useLocale, useTranslations} from "next-intl";
import {usePathname, useRouter} from "@/i18n/navigation";
import {routing} from "@/i18n/routing";
import styles from "./LocaleSwitcher.module.scss";

export default function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function onSelect(event: React.ChangeEvent<HTMLSelectElement>) {
    // Gleiche Seite, andere Sprache — Prefix wird automatisch gesetzt/entfernt
    router.replace(pathname, {locale: event.target.value});
  }

  return (
    <div className={styles.switcher}>
      <label className={styles.label} htmlFor="locale-select">
        {t("label")}
      </label>
      <select
        id="locale-select"
        className={styles.select}
        value={locale}
        onChange={onSelect}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {t("locale", {locale: loc})}
          </option>
        ))}
      </select>
    </div>
  );
}
