import {getFormatter, getLocale, getTranslations} from "next-intl/server";
import {formatEur} from "@/lib/money";
import styles from "./BidHistory.module.scss";

type Bid = {
  id: string;
  amount: number; // in Cent
  createdAt: Date;
  bidderName: string;
};

type Props = {
  bids: Bid[];
};

export default async function BidHistory({bids}: Props) {
  const t = await getTranslations("Auctions.history");
  const format = await getFormatter();
  const locale = await getLocale();

  return (
    <section className={`card ${styles.history}`}>
      <h2>{t("title")}</h2>
      {bids.length === 0 ? (
        <p className={styles.empty}>{t("empty")}</p>
      ) : (
        <ul className={styles.list}>
          {bids.map((bid) => (
            <li className={styles.item} key={bid.id}>
              <span className={styles.amount}>
                {formatEur(bid.amount, locale)}
              </span>
              <span className={styles.bidder}>{bid.bidderName}</span>
              <time
                className={styles.time}
                dateTime={bid.createdAt.toISOString()}
              >
                {format.dateTime(bid.createdAt, {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
