import Image from "next/image";
import {getFormatter, getTranslations} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import Countdown from "./Countdown";
import styles from "./AuctionCard.module.scss";

type Props = {
  auction: {
    id: string;
    title: string;
    imageUrl: string;
    currentPrice: number; // in Cent
    endsAt: Date;
    status: string;
    bidCount: number;
  };
};

// Schwelle für den "Endet bald"-Hinweis: letzte Stunde der Laufzeit.
const ENDING_SOON_MS = 60 * 60 * 1000;

export default async function AuctionCard({auction}: Props) {
  const t = await getTranslations("Auctions");
  const format = await getFormatter();

  const msLeft = auction.endsAt.getTime() - new Date().getTime();
  const isLive = auction.status === "active" && msLeft > 0;
  const endingSoon = isLive && msLeft <= ENDING_SOON_MS;

  return (
    <Link href={`/auctions/${auction.id}`} className={`card ${styles.card}`}>
      <div className={styles.imageWrap}>
        <Image
          src={auction.imageUrl}
          alt={auction.title}
          fill
          sizes="(min-width: 900px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={styles.image}
        />
        {endingSoon && (
          <span className={styles.endingSoon}>{t("card.endingSoon")}</span>
        )}
      </div>
      <div className={styles.body}>
        <h2 className={styles.title}>{auction.title}</h2>
        <p className={styles.price}>
          {t("card.currentBid")}{" "}
          <strong>
            {format.number(auction.currentPrice / 100, {
              style: "currency",
              currency: "EUR",
            })}
          </strong>
        </p>
        <div className={styles.footer}>
          <Countdown endsAt={auction.endsAt.toISOString()} variant="compact" />
          <span className={styles.bids}>
            {t("card.bids", {count: auction.bidCount})}
          </span>
        </div>
      </div>
    </Link>
  );
}
