"use client";

import {useEffect, useRef} from "react";
import styles from "./Reveal.module.scss";

type Props = {
  children: React.ReactNode;
  className?: string;
};

// Dezentes Einblenden beim Reinscrollen (Fade + leichter Slide-up).
// Leichtgewichtig via IntersectionObserver, respektiert prefers-reduced-motion.
// Die Sichtbarkeit wird per classList am DOM-Knoten gesetzt (kein Re-Render).
export default function Reveal({children, className}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduzierte Bewegung: CSS zeigt den Inhalt bereits — nichts zu tun.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            obs.disconnect();
          }
        }
      },
      {threshold: 0.15, rootMargin: "0px 0px -10% 0px"},
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${styles.reveal} ${className ?? ""}`}>
      {children}
    </div>
  );
}
