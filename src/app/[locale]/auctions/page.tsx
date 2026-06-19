import {and, desc, eq, gt, isNull, or, sql} from "drizzle-orm";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {auctions, bids, db} from "@/lib/db";
import AuctionCard from "@/components/AuctionCard";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{locale: string}>;
};

export default async function AuctionsPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Auctions");

  // Aktive Anzeigen, neueste zuerst. Auktionen nur, solange nicht abgelaufen;
  // reine Festpreis-Anzeigen (endsAt == null) laufen nie ab und bleiben sichtbar.
  const list = await db
    .select({
      id: auctions.id,
      title: auctions.title,
      imageUrl: auctions.imageUrl,
      currentPrice: auctions.currentPrice,
      endsAt: auctions.endsAt,
      buyNowPrice: auctions.buyNowPrice,
      status: auctions.status,
      bidCount: sql<number>`count(${bids.id})::int`,
    })
    .from(auctions)
    .leftJoin(bids, eq(bids.auctionId, auctions.id))
    .where(
      and(
        eq(auctions.status, "active"),
        or(isNull(auctions.endsAt), gt(auctions.endsAt, new Date())),
      ),
    )
    .groupBy(auctions.id)
    .orderBy(desc(auctions.createdAt));

  return (
    <div className={styles.page}>
      <h1>{t("list.title")}</h1>
      {list.length === 0 ? (
        <p className={styles.empty}>{t("list.empty")}</p>
      ) : (
        <div className={styles.grid}>
          {list.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </div>
  );
}
