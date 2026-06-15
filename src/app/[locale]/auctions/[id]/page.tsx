import Image from "next/image";
import {notFound} from "next/navigation";
import {eq} from "drizzle-orm";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import {auctions, db, user} from "@/lib/db";
import Countdown from "@/components/Countdown";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{locale: string; id: string}>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AuctionDetailPage({params}: Props) {
  const {locale, id} = await params;
  setRequestLocale(locale);

  // Ungültige IDs gar nicht erst an die DB geben
  if (!UUID_RE.test(id)) {
    notFound();
  }

  const [auction] = await db
    .select({
      id: auctions.id,
      title: auctions.title,
      description: auctions.description,
      imageUrl: auctions.imageUrl,
      currentPrice: auctions.currentPrice,
      endsAt: auctions.endsAt,
      sellerName: user.name,
    })
    .from(auctions)
    .innerJoin(user, eq(auctions.sellerId, user.id))
    .where(eq(auctions.id, id))
    .limit(1);

  if (!auction) {
    notFound();
  }

  const t = await getTranslations("Auctions");
  const format = await getFormatter();

  return (
    <article className={styles.detail}>
      <div className={styles.imageWrap}>
        <Image
          src={auction.imageUrl}
          alt={auction.title}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className={styles.image}
          priority
        />
      </div>

      <div className={styles.info}>
        <h1>{auction.title}</h1>
        <p className={styles.seller}>
          {t("detail.seller", {name: auction.sellerName})}
        </p>

        <p className={styles.price}>
          <span className={styles.priceLabel}>{t("detail.currentBid")}</span>
          <span className={styles.priceValue}>
            {format.number(auction.currentPrice / 100, {
              style: "currency",
              currency: "EUR",
            })}
          </span>
        </p>

        <div className={styles.countdown}>
          <span className={styles.countdownLabel}>{t("detail.timeLeft")}</span>
          <Countdown endsAt={auction.endsAt.toISOString()} />
        </div>

        <p className={styles.endsAt}>
          {t("detail.endsAt", {
            date: format.dateTime(auction.endsAt, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          })}
        </p>

        <div className={styles.description}>
          <h2>{t("detail.description")}</h2>
          <p>{auction.description}</p>
        </div>
      </div>
    </article>
  );
}
