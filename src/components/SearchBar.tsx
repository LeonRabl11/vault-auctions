"use client";

import {useRef, useState} from "react";
import {useTranslations} from "next-intl";
import {useSearchParams} from "next/navigation";
import {Search, X} from "lucide-react";
import {usePathname, useRouter} from "@/i18n/navigation";
import styles from "./SearchBar.module.scss";

// Suchfeld über dem Marktplatz-Grid. Schreibt den Begriff als ?q= in die URL
// (server-seitig lesbar, teil-/bookmarkbar) und behält dabei ?kategorie= bei.
// Die Server-Component liest q und filtert; dieses Feld hält nur die Eingabe.
export default function SearchBar() {
  const t = useTranslations("Auctions.search");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q") ?? "";

  const [value, setValue] = useState(queryFromUrl);

  // URL ist die Quelle der Wahrheit: ändert sich ?q= extern (Kategorie-Klick,
  // Zurück-Button, „Filter zurücksetzen"), die Eingabe beim Rendern nachziehen.
  // Offizielles React-Muster (State aus vorherigem Render) — kein Effect.
  const [prevUrlQuery, setPrevUrlQuery] = useState(queryFromUrl);
  if (prevUrlQuery !== queryFromUrl) {
    setPrevUrlQuery(queryFromUrl);
    setValue(queryFromUrl);
  }

  // ?q= setzen/entfernen, andere Parameter (z. B. kategorie) beibehalten.
  function commit(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = next.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    router.replace({pathname, query: Object.fromEntries(params)}, {scroll: false});
  }

  // Tippen aktualisiert das Feld sofort, die URL leicht verzögert (Debounce).
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), 300);
  }

  function clear() {
    clearTimeout(timer.current);
    setValue("");
    commit("");
  }

  return (
    <div className={styles.wrap}>
      <Search className={styles.icon} size={18} aria-hidden />
      <input
        type="search"
        className={`input ${styles.input}`}
        placeholder={t("placeholder")}
        aria-label={t("placeholder")}
        value={value}
        onChange={onChange}
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          onClick={clear}
          aria-label={t("clear")}
        >
          <X size={18} aria-hidden />
        </button>
      )}
    </div>
  );
}
