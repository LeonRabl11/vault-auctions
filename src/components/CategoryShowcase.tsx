"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {useTranslations} from "next-intl";
import {ChevronLeft, ChevronRight} from "lucide-react";
import Image from "next/image";
import {Link} from "@/i18n/navigation";
import type {CategorySlug} from "@/lib/categories";
import styles from "./CategoryShowcase.module.scss";

// Slides für den Showcase-Slider. labelKey/textKey zeigen in den i18n-Namespace
// "HomePage.showcase.items"; slug ist die Ziel-Kategorie im Marktplatz. Das Label
// kann vom Kategorienamen abweichen (Möbel → einrichtung, Technik → elektronik).
type Slide = {
  image: string;
  labelKey: string;
  textKey: string;
  slug: CategorySlug;
};

const SLIDES: readonly Slide[] = [
  {image: "schmuck.jpg", labelKey: "items.schmuck.label", textKey: "items.schmuck.text", slug: "schmuck"},
  {image: "kunst.jpg", labelKey: "items.kunst.label", textKey: "items.kunst.text", slug: "kunst"},
  {image: "auto.jpg", labelKey: "items.autos.label", textKey: "items.autos.text", slug: "autos_motorraeder"},
  {image: "geld.jpg", labelKey: "items.muenzen.label", textKey: "items.muenzen.text", slug: "muenzen_briefmarken"},
  {image: "buecher.jpg", labelKey: "items.buecher.label", textKey: "items.buecher.text", slug: "buecher_geschichte"},
  {image: "einrichtung.jpg", labelKey: "items.einrichtung.label", textKey: "items.einrichtung.text", slug: "einrichtung"},
  {image: "moebel.jpg", labelKey: "items.moebel.label", textKey: "items.moebel.text", slug: "einrichtung"},
  {image: "pflanzen.jpg", labelKey: "items.pflanzen.label", textKey: "items.pflanzen.text", slug: "pflanzen"},
  {image: "mode.jpg", labelKey: "items.mode.label", textKey: "items.mode.text", slug: "mode"},
  {image: "technik.jpg", labelKey: "items.technik.label", textKey: "items.technik.text", slug: "elektronik"},
];

// Horizontaler Bild-Slider auf der Startseite. Natives Scroll-Snapping (Touch/
// Trackpad), Mausrad-Übersetzung und Klick-und-Ziehen wie die Kategorie-Leiste.
// Pfeil-Buttons scrollen smooth um eine Kartenbreite und erscheinen nur, wenn in
// die Richtung Inhalt vorhanden ist.
export default function CategoryShowcase() {
  const t = useTranslations("HomePage.showcase");

  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  // Klick-und-Ziehen (nur Maus). `moved` unterdrückt den Link-Klick nach dem Ziehen.
  const drag = useRef({active: false, startX: 0, startScroll: 0, moved: false});

  const updateChevrons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateChevrons();
    const el = trackRef.current;
    if (!el) return;

    // Vertikales Mausrad über dem Slider in horizontales Scrollen übersetzen.
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

  // Um eine Kartenbreite (inkl. Gap) scrollen; prefers-reduced-motion respektieren.
  const scroll = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const step = card ? card.offsetWidth + gap : el.clientWidth;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({left: direction * step, behavior: reduce ? "auto" : "smooth"});
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Touch/Pen nutzen natives Scrollen; nur primäre Maustaste ziehen.
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = trackRef.current;
    if (!el) return;
    drag.current = {active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false};
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = trackRef.current;
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

  return (
    <section className={styles.showcase} aria-label={t("title")}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h2 className={styles.title}>{t("title")}</h2>
      </header>

      <div className={styles.viewport}>
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
          className={styles.track}
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onClickCapture={onClickCapture}
        >
          {SLIDES.map((slide) => {
            const label = t(slide.labelKey);
            return (
              <Link
                key={slide.image}
                href={{pathname: "/marktplatz", query: {kategorie: slide.slug}}}
                className={styles.card}
              >
                <span className={styles.media}>
                  <Image
                    src={`/categories/${slide.image}`}
                    alt={label}
                    fill
                    draggable={false}
                    sizes="(min-width: 900px) 22rem, (min-width: 640px) 45vw, 75vw"
                    className={styles.image}
                  />
                  <span className={styles.scrim} aria-hidden />
                  <span className={styles.pill}>{label}</span>
                  <span className={styles.caption}>{t(slide.textKey)}</span>
                </span>
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
    </section>
  );
}
