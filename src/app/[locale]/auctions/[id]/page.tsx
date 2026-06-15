import Image from "next/image";
import {headers} from "next/headers";
import {notFound} from "next/navigation";
import {desc, eq} from "drizzle-orm";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import {auctions, bids, db, user} from "@/lib/db";
import {auth} from "@/lib/auth";
import {finalizeAuction} from "@/lib/auctions";
import {Link} from "@/i18n/navigation";
import Countdown from "@/components/Countdown";
import BidForm from "@/components/BidForm";
import BidHistory from "@/components/BidHistory";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{locale: string; id: string}>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function loadAuction(id: string) {
  return db
    .select({
      id: auctions.id,
      title: auctions.title,
      description: auctions.description,
      imageUrl: auctions.imageUrl,
      currentPrice: auctions.currentPrice,
      endsAt: auctions.endsAt,
      status: auctions.status,
      sellerId: auctions.sellerId,
      sellerName: user.name,
      winnerId: auctions.winnerId,
    })
    .from(auctions)
    .innerJoin(user, eq(auctions.sellerId, user.id))
    .where(eq(auctions.id, id))
    .limit(1);
}

export default async function AuctionDetailPage({params}: Props) {
  const {locale, id} = await params;
  setRequestLocale(locale);

  // Ungültige IDs gar nicht erst an die DB geben
  if (!UUID_RE.test(id)) {
    notFound();
  }

  let [auction] = await loadAuction(id);
  if (!auction) {
    notFound();
  }

  // Lazy Expiration: abgelaufene aktive Auktion abschließen, dann neu laden
  if (
    auction.status === "active" &&
    auction.endsAt.getTime() < new Date().getTime()
  ) {
    await finalizeAuction(id);
    [auction] = await loadAuction(id);
    if (!auction) {
      notFound();
    }
  }

  // Gewinner-Name (nur wenn beendet und es einen Gewinner gibt)
  let winnerName: string | null = null;
  if (auction.winnerId) {
    const [winner] = await db
      .select({name: user.name})
      .from(user)
      .where(eq(user.id, auction.winnerId))
      .limit(1);
    winnerName = winner?.name ?? null;
  }

  // Gebotsverlauf (neuestes zuerst), inkl. Bietername
  const bidList = await db
    .select({
      id: bids.id,
      amount: bids.amount,
      createdAt: bids.createdAt,
      bidderName: user.name,
    })
    .from(bids)
    .innerJoin(user, eq(bids.bidderId, user.id))
    .where(eq(bids.auctionId, id))
    .orderBy(desc(bids.createdAt));

  const session = await auth.api.getSession({headers: await headers()});

  const isActive =
    auction.status === "active" &&
    auction.endsAt.getTime() > new Date().getTime();
  const isSeller = session?.user.id === auction.sellerId;
  const isWinner = Boolean(
    auction.winnerId && session?.user.id === auction.winnerId,
  );

  const t = await getTranslations("Auctions");
  const format = await getFormatter();

  return (
    <div className={styles.page}>
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
            <span className={styles.countdownLabel}>
              {t("detail.timeLeft")}
            </span>
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

          <div className={`card ${styles.bidBox}`}>
            {isActive ? (
              // Aktiv: bieten (nur eingeloggt + nicht Verkäufer)
              session ? (
                isSeller ? (
                  <p className={styles.bidNote}>{t("bid.sellerHint")}</p>
                ) : (
                  <BidForm
                    auctionId={auction.id}
                    currentPrice={auction.currentPrice}
                  />
                )
              ) : (
                <p className={styles.bidNote}>
                  {t("bid.loginPrompt")}{" "}
                  <Link href="/login">{t("bid.loginLink")}</Link>
                </p>
              )
            ) : auction.winnerId ? (
              // Beendet mit Gewinner
              isWinner ? (
                <div className={styles.result}>
                  <p className={styles.win}>{t("result.youWon")}</p>
                  <p className={styles.bidNote}>{t("result.youWonHint")}</p>
                </div>
              ) : (
                <div className={styles.result}>
                  <p className={styles.resultTitle}>{t("result.ended")}</p>
                  <p className={styles.bidNote}>
                    {t("result.winner", {name: winnerName ?? ""})}
                  </p>
                </div>
              )
            ) : (
              // Beendet ohne Gebote
              <p className={styles.bidNote}>{t("result.noBids")}</p>
            )}
          </div>

          <div className={styles.description}>
            <h2>{t("detail.description")}</h2>
            <p>{auction.description}</p>
          </div>
        </div>
      </article>

      <BidHistory bids={bidList} />
    </div>
  );
}
