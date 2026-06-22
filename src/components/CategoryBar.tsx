"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {useTranslations} from "next-intl";
import {useSearchParams} from "next/navigation";
import {ChevronLeft, ChevronRight, LayoutGrid} from "lucide-react";
import {Link, usePathname} from "@/i18n/navigation";
import {CATEGORIES} from "@/lib/categories";
import styles from "./CategoryBar.module.scss";

// Leiste nur auf Startseite und Marktplatz-Übersicht zeigen (nicht im Dashboard,
// beim Anzeige-Erstellen oder auf Auth-Seiten). usePathname ist locale-bereinigt.
const VISIBLE_ON = ["/", "/marktplatz"];

// Auswählbare Kategorie-Leiste direkt unter dem Header. Filtert den Marktplatz
// über ?kategorie=<slug>; "Alle" setzt den Filter zurück. Aktive Kategorie wird
// aus dem Search-Param abgeleitet.
export default function CategoryBar() {
  const t = useTranslations("Categories");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("kategorie");

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  // Klick-und-Ziehen (nur Maus). `moved` unterdrückt den Link-Klick nach dem Ziehen.
  const drag = useRef({active: false, startX: 0, startScroll: 0, moved: false});

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

    // Vertikales Mausrad über der Leiste in horizontales Scrollen übersetzen.
    // Nativer Listener mit passive:false, damit preventDefault greift.
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return; // passt rein → nichts tun
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // schon horizontal → nativ
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener("scroll", updateChevrons, {passive: true});
    el.addEventListener("wheel", onWheel, {passive: false});
    window.addEventListener("resize", updateChevrons);
    return () => {
      el.removeEventListener("scroll", updateChevrons);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", updateChevrons);
    };
  }, [updateChevrons]);

  const scroll = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({left: direction * el.clientWidth * 0.8, behavior: "smooth"});
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Touch/Pen nutzen natives Scrollen; nur primäre Maustaste ziehen.
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = {active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false};
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = scrollerRef.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  };

  const endDrag = () => {
    drag.current.active = false;
  };

  // Nach einem Zieh-Vorgang den folgenden Link-Klick verschlucken.
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  if (!VISIBLE_ON.includes(pathname)) return null;

  return (
    <nav className={styles.bar} aria-label={t("bar")}>
      <div className={styles.inner} data-fade-left={canLeft} data-fade-right={canRight}>
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

        <div
          className={styles.scroller}
          ref={scrollerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onClickCapture={onClickCapture}
        >
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
