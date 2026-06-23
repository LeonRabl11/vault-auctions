"use client";

import {useTranslations} from "next-intl";
import {useSearchParams} from "next/navigation";
import {ChevronDown} from "lucide-react";
import {usePathname, useRouter} from "@/i18n/navigation";
import {DEFAULT_SORT, isSortKey, SORT_OPTIONS} from "@/lib/marktplatz-sort";
import styles from "./SortSelect.module.scss";

// Sortier-Auswahl für den Marktplatz. Schreibt die Auswahl als ?sort= in die URL
// (server-seitig lesbar, teil-/bookmarkbar) und behält q/kategorie bei. Der Wert
// wird direkt aus der URL abgeleitet — kein lokaler State nötig.
export default function SortSelect() {
  const t = useTranslations("Auctions.sort");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("sort");
  const current = isSortKey(fromUrl) ? fromUrl : DEFAULT_SORT;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    // Standard ("newest") nicht in die URL schreiben -> saubere Default-URLs.
    if (isSortKey(next) && next !== DEFAULT_SORT) params.set("sort", next);
    else params.delete("sort");
    router.replace({pathname, query: Object.fromEntries(params)}, {scroll: false});
  }

  return (
    <label className={styles.wrap}>
      <span className={styles.label}>{t("label")}</span>
      <span className={styles.field}>
        <select
          className={styles.select}
          value={current}
          onChange={onChange}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(`options.${opt}`)}
            </option>
          ))}
        </select>
        <ChevronDown className={styles.icon} size={16} aria-hidden />
      </span>
    </label>
  );
}
