import Skeleton from "@/components/Skeleton";
import AuctionCardSkeleton from "@/components/AuctionCardSkeleton";
import styles from "./page.module.scss";
import loading from "./loading.module.scss";

// Lade-Skeleton der Marktplatz-Liste — gleiches Raster/Maße wie die echte Seite,
// damit beim Wechsel kein Layout-Sprung entsteht.
export default function Loading() {
  return (
    <div className={styles.page} aria-busy="true">
      <Skeleton className={loading.title} />

      <div className={styles.toolbar}>
        <Skeleton className={loading.search} />
        <Skeleton className={loading.sort} />
      </div>

      <Skeleton className={loading.count} />

      <div className={styles.grid}>
        {Array.from({length: 6}).map((_, i) => (
          <AuctionCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
