"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {useTranslations} from "next-intl";
import {useSearchParams} from "next/navigation";
import {ChevronLeft, ChevronRight, LayoutGrid} from "lucide-react";
import {Link} from "@/i18n/navigation";
import {CATEGORIES} from "@/lib/categories";
import styles from "./CategoryBar.module.scss";

// Auswählbare Kategorie-Leiste direkt unter dem Header. Filtert den Marktplatz
// über ?kategorie=<slug>; "Alle" setzt den Filter zurück. Aktive Kategorie wird
// aus dem Search-Param abgeleitet.
export default function CategoryBar() {
  const t = useTranslations("Categories");
  const searchParams = useSearchParams();
  const active = searchParams.get("kategorie");

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateChevrons = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateChevrons();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateChevrons, {passive: true});
    window.addEventListener("resize", updateChevrons);
    return () => {
      el.removeEventListener("scroll", updateChevrons);
      window.removeEventListener("resize", updateChevrons);
    };
  }, [updateChevrons]);

  const scroll = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({left: direction * el.clientWidth * 0.8, behavior: "smooth"});
  };

  return (
    <nav className={styles.bar} aria-label={t("bar")}>
      <div className={styles.inner}>
        <button
          type="button"
          className={`${styles.chevron} ${styles.left}`}
          aria-label={t("prev")}
          aria-hidden={!canLeft}
          tabIndex={canLeft ? 0 : -1}
          data-visible={canLeft}
          onClick={() => scroll(-1)}
        >
          <ChevronLeft size={20} aria-hidden />
        </button>

        <div className={styles.scroller} ref={scrollerRef}>
          <Link
            href="/marktplatz"
            className={`${styles.item} ${!active ? styles.active : ""}`}
            aria-current={!active ? "page" : undefined}
          >
            <span className={styles.icon}>
              <LayoutGrid size={24} aria-hidden />
            </span>
            <span className={styles.label}>{t("all")}</span>
          </Link>

          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const isActive = active === c.slug;
            return (
              <Link
                key={c.slug}
                href={{pathname: "/marktplatz", query: {kategorie: c.slug}}}
                className={`${styles.item} ${isActive ? styles.active : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className={styles.icon}>
                  <Icon size={24} aria-hidden />
                </span>
                <span className={styles.label}>{t(c.labelKey)}</span>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          className={`${styles.chevron} ${styles.right}`}
          aria-label={t("next")}
          aria-hidden={!canRight}
          tabIndex={canRight ? 0 : -1}
          data-visible={canRight}
          onClick={() => scroll(1)}
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
