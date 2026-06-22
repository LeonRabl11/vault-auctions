import Image from "next/image";
import {headers} from "next/headers";
import {notFound} from "next/navigation";
import {desc, eq} from "drizzle-orm";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import {auctions, bids, db, orders, user} from "@/lib/db";
import {auth} from "@/lib/auth";
import {finalizeAuctionAndNotify} from "@/lib/auctions";
import {Link} from "@/i18n/navigation";
import Countdown from "@/components/Countdown";
import BidForm from "@/components/BidForm";
import BuyNowButton from "@/components/BuyNowButton";
import BidHistory from "@/components/BidHistory";
import PayButton from "@/components/PayButton";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{locale: string; id: string}>;
  searchParams: Promise<{paid?: string}>;
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
      category: auctions.category,
      currentPrice: auctions.currentPrice,
      endsAt: auctions.endsAt,
      buyNowPrice: auctions.buyNowPrice,
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

export default async function AuctionDetailPage({params, searchParams}: Props) {
  const {locale, id} = await params;
  const {paid} = await searchParams;
  setRequestLocale(locale);

  // Ungültige IDs gar nicht erst an die DB geben
  if (!UUID_RE.test(id)) {
    notFound();
  }

  let [auction] = await loadAuction(id);
  if (!auction) {
    notFound();
  }

  // Lazy Expiration: abgelaufene aktive Auktion abschließen, dann neu laden.
  // Reine Festpreis-Anzeigen (endsAt == null) laufen nie ab.
  if (
    auction.status === "active" &&
    auction.endsAt != null &&
    auction.endsAt.getTime() < new Date().getTime()
  ) {
    await finalizeAuctionAndNotify(id);
    [auction] = await loadAuction(id);
    if (!auction) {
      notFound();
    }
  }

  // Order zur Auktion (falls vorhanden) — Quelle der Wahrheit für den Abschluss
  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      buyerId: orders.buyerId,
      paymentDueAt: orders.paymentDueAt,
    })
    .from(orders)
    .where(eq(orders.auctionId, id))
    .limit(1);

  // Gewinner-/Käufer-Name (Order bevorzugt; nach Ablauf ist winnerId null)
  const buyerOrWinnerId = order?.buyerId ?? auction.winnerId;
  let buyerName: string | null = null;
  if (buyerOrWinnerId) {
    const [u] = await db
      .select({name: user.name})
      .from(user)
      .where(eq(user.id, buyerOrWinnerId))
      .limit(1);
    buyerName = u?.name ?? null;
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

  // Auktion = Laufzeit gesetzt; reine Festpreis-Anzeige hat endsAt == null
  const isAuction = auction.endsAt != null;
  const isActive =
    auction.status === "active" &&
    auction.endsAt != null &&
    auction.endsAt.getTime() > new Date().getTime();
  // Sofort-Kauf möglich, solange die Anzeige aktiv ist (auch mit laufenden Geboten)
  const canBuyNow = auction.status === "active" && auction.buyNowPrice != null;
  const isSeller = session?.user.id === auction.sellerId;
  const isViewerBuyer = Boolean(
    buyerOrWinnerId && session?.user.id === buyerOrWinnerId,
  );

  const t = await getTranslations("Auctions");
  const format = await getFormatter();

  return (
    <div className={styles.page}>
      {paid === "1" && order?.status === "paid" && (
        <p className={styles.paidBanner}>{t("result.paidBanner")}</p>
      )}

      <article className={styles.detail}>
        <div className={styles.imageWrap}>
          {auction.imageUrl ? (
            <Image
              src={auction.imageUrl}
              alt={auction.title}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className={styles.image}
              priority
            />
          ) : (
            <ImagePlaceholder category={auction.category} />
          )}
        </div>

        <div className={styles.info}>
          <h1>{auction.title}</h1>
          <p className={styles.seller}>
            {t("detail.seller", {name: auction.sellerName})}
          </p>

          {/* Auktionsdaten nur bei Auktionen (Festpreis-Anzeige hat keine) */}
          {isAuction && auction.endsAt != null && (
            <>
              <p className={styles.price}>
                <span className={styles.priceLabel}>
                  {t("detail.currentBid")}
                </span>
                <span className={styles.priceValue}>
                  {format.number((auction.currentPrice ?? 0) / 100, {
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
            </>
          )}

          <div className={`card ${styles.bidBox}`}>
            {auction.status === "active" ? (
              // Aktiv: bieten und/oder sofort kaufen (nur eingeloggt + nicht Verkäufer)
              !session ? (
                <p className={styles.bidNote}>
                  {t("bid.loginPrompt")}{" "}
                  <Link href="/login">{t("bid.loginLink")}</Link>
                </p>
              ) : isSeller ? (
                <p className={styles.bidNote}>{t("bid.sellerHint")}</p>
              ) : (
                <div className={styles.actions}>
                  {isActive && (
                    <BidForm
                      auctionId={auction.id}
                      currentPrice={auction.currentPrice ?? 0}
                    />
                  )}
                  {canBuyNow && auction.buyNowPrice != null && (
                    <BuyNowButton
                      auctionId={auction.id}
                      price={auction.buyNowPrice}
                    />
                  )}
                </div>
              )
            ) : order ? (
              // Beendet mit Order
              order.status === "paid" ? (
                <p className={styles.win}>
                  {isViewerBuyer ? t("result.paidYou") : t("result.paid")}
                </p>
              ) : order.status === "pending" ? (
                isViewerBuyer ? (
                  <div className={styles.result}>
                    <p className={styles.win}>{t("result.youWon")}</p>
                    <p className={styles.bidNote}>
                      {t("result.payBy", {
                        date: format.dateTime(order.paymentDueAt, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }),
                      })}
                    </p>
                    <PayButton orderId={order.id} />
                  </div>
                ) : (
                  <p className={styles.bidNote}>{t("result.soldPending")}</p>
                )
              ) : (
                // expired
                <p className={styles.bidNote}>{t("result.expired")}</p>
              )
            ) : auction.winnerId ? (
              // Beendet mit Gewinner, aber (noch) ohne Order
              <div className={styles.result}>
                <p className={styles.resultTitle}>{t("result.ended")}</p>
                <p className={styles.bidNote}>
                  {t("result.winner", {name: buyerName ?? ""})}
                </p>
              </div>
            ) : (
              // Beendet ohne Gebote
              <p className={styles.bidNote}>{t("result.noBids")}</p>
            )}
          </div>

          {/* Eigentümer kann eine aktive Anzeige bearbeiten (Löschen liegt jetzt
              auf der Bearbeiten-Seite). Bei Geboten sind Preis/Laufzeit dort
              gesperrt — serverseitig erzwungen. */}
          {isSeller && auction.status === "active" && (
            <Link
              href={`/marktplatz/${auction.id}/edit`}
              className={`btn ${styles.editLink}`}
            >
              {t("edit.cta")}
            </Link>
          )}

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
