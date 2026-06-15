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
  };
};

export default async function AuctionCard({auction}: Props) {
  const t = await getTranslations("Auctions");
  const format = await getFormatter();

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
        <Countdown endsAt={auction.endsAt.toISOString()} variant="compact" />
      </div>
    </Link>
  );
}
