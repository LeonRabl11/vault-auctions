import Skeleton from "./Skeleton";
// Karten-Layout (Raster/Maße) 1:1 von der echten Karte übernehmen -> kein Sprung.
import card from "./AuctionCard.module.scss";
import styles from "./AuctionCardSkeleton.module.scss";

export default function AuctionCardSkeleton() {
  return (
    <div className={`card ${card.card}`} aria-hidden>
      <div className={card.imageWrap}>
        <Skeleton className={styles.image} />
      </div>
      <div className={card.body}>
        <Skeleton className={styles.title} />
        <Skeleton className={styles.price} />
        <div className={card.footer}>
          <Skeleton className={styles.meta} />
          <Skeleton className={styles.metaShort} />
        </div>
      </div>
    </div>
  );
}
