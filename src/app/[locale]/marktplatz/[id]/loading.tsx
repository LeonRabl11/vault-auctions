import Skeleton from "@/components/Skeleton";
import styles from "./page.module.scss";
import loading from "./loading.module.scss";

// Lade-Skeleton der Detailseite: Bildbereich, Titel, Preis/Countdown, Aktions-
// box und Beschreibung — gleiche Struktur/Maße wie die echte Seite.
export default function Loading() {
  return (
    <div className={styles.page} aria-busy="true">
      <article className={styles.detail}>
        <div className={styles.imageWrap}>
          <Skeleton className={loading.image} />
        </div>

        <div className={styles.info}>
          <Skeleton className={loading.heading} />
          <Skeleton className={loading.seller} />
          <Skeleton className={loading.price} />
          <Skeleton className={loading.countdown} />

          <div className={`card ${loading.box}`}>
            <Skeleton className={loading.button} />
          </div>

          <Skeleton className={loading.descTitle} />
          <Skeleton className={loading.descLine} />
          <Skeleton className={loading.descLine} />
          <Skeleton className={loading.descLineShort} />
        </div>
      </article>
    </div>
  );
}
