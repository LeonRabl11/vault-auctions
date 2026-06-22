import {CATEGORIES, FALLBACK_CATEGORY_ICON} from "@/lib/categories";
import styles from "./ImagePlaceholder.module.scss";

// Dezenter Platzhalter für Anzeigen ohne Bild: neutrale Fläche mit dem
// Kategorie-Icon. Füllt den umgebenden imageWrap (position: relative) komplett,
// damit das Layout nicht bricht. Rein dekorativ.
export default function ImagePlaceholder({category}: {category: string}) {
  // Member-Zugriff (wie in CategoryBar) statt Funktionsaufruf — sonst meldet
  // react-hooks/static-components eine "während des Renders erzeugte" Komponente.
  const Icon =
    CATEGORIES.find((c) => c.slug === category)?.icon ?? FALLBACK_CATEGORY_ICON;
  return (
    <div className={styles.placeholder} aria-hidden>
      <Icon className={styles.icon} strokeWidth={1.5} />
    </div>
  );
}
