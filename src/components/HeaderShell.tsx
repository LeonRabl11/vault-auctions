"use client";

import {useEffect, useState} from "react";
import styles from "./Header.module.scss";

// Sticky-Header mit dezentem Schatten, sobald gescrollt wird. Reiner
// Optik-Wrapper — die (serverseitig gerenderten) Inhalte kommen als children.
export default function HeaderShell({children}: {children: React.ReactNode}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, {passive: true});
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      {children}
    </header>
  );
}
