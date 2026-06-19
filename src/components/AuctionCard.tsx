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
    currentPrice: number | null; // in Cent, null = keine Auktion
    endsAt: Date | null; // null = reine Festpreis-Anzeige
    buyNowPrice: number | null; // in Cent, null = kein Sofort-Kauf
    status: string;
    bidCount: number;
  };
};

// Schwelle für den "Endet bald"-Hinweis: letzte Stunde der Laufzeit.
const ENDING_SOON_MS = 60 * 60 * 1000;

export default async function AuctionCard({auction}: Props) {
  const t = await getTranslations("Auctions");
  const format = await getFormatter();

  const isAuction = auction.endsAt != null;
  const hasBuyNow = auction.buyNowPrice != null;

  const msLeft = auction.endsAt
    ? auction.endsAt.getTime() - new Date().getTime()
    : 0;
  const isLive =
    auction.status === "active" && auction.endsAt != null && msLeft > 0;
  const endingSoon = isLive && msLeft <= ENDING_SOON_MS;

  const eur = (cents: number) =>
    format.number(cents / 100, {style: "currency", currency: "EUR"});

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

        {/* Auktion: aktuelles Höchstgebot */}
        {isAuction && (
          <p className={styles.price}>
            {t("card.currentBid")}{" "}
            <strong>{eur(auction.currentPrice ?? 0)}</strong>
          </p>
        )}

        {/* Festpreis: Sofort-Kauf-Preis (zusätzlich, falls auch Auktion) */}
        {hasBuyNow && (
          <p className={styles.price}>
            {t("card.buyNow")}{" "}
            <strong>{eur(auction.buyNowPrice ?? 0)}</strong>
          </p>
        )}

        <div className={styles.footer}>
          {isAuction && auction.endsAt ? (
            <>
              <Countdown
                endsAt={auction.endsAt.toISOString()}
                variant="compact"
              />
              <span className={styles.bids}>
                {t("card.bids", {count: auction.bidCount})}
              </span>
            </>
          ) : hasBuyNow ? (
            <span className={styles.buyNowBadge}>{t("card.buyNowBadge")}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
