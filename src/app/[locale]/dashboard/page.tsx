import {headers} from "next/headers";
import {desc, eq, sql} from "drizzle-orm";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import {auth} from "@/lib/auth";
import {auctions, bids, db, orders} from "@/lib/db";
import {Link, redirect} from "@/i18n/navigation";
import PayButton from "@/components/PayButton";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{locale: string}>;
};

// Badge-Variante (Farbe) je Statuskategorie — Mapping an einer Stelle.
type Badge = "success" | "danger" | "accent" | "muted";

export default async function DashboardPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  // Echte, serverseitige Session-Prüfung (Middleware ist nur optimistisch)
  const session = await auth.api.getSession({headers: await headers()});
  if (!session) {
    redirect({href: "/login", locale});
    return null;
  }
  const userId = session.user.id;

  const t = await getTranslations("Dashboard");
  const format = await getFormatter();

  const euro = (cents: number) =>
    format.number(cents / 100, {style: "currency", currency: "EUR"});

  // === Queries (je Bereich eine, Aggregate statt N+1) ===

  // 1. Meine Auktionen (Verkäufer): + Gebotsanzahl (count) + Order-Status (join)
  const selling = await db
    .select({
      id: auctions.id,
      title: auctions.title,
      status: auctions.status,
      currentPrice: auctions.currentPrice,
      winnerId: auctions.winnerId,
      orderStatus: orders.status,
      bidCount: sql<number>`count(${bids.id})::int`,
    })
    .from(auctions)
    .leftJoin(orders, eq(orders.auctionId, auctions.id))
    .leftJoin(bids, eq(bids.auctionId, auctions.id))
    .where(eq(auctions.sellerId, userId))
    .groupBy(auctions.id, orders.id)
    .orderBy(desc(auctions.createdAt));

  // 2. Meine Gebote (Bieter): mein Höchstgebot (max) je Auktion, zuletzt geboten zuerst
  const bidding = await db
    .select({
      id: auctions.id,
      title: auctions.title,
      status: auctions.status,
      currentPrice: auctions.currentPrice,
      winnerId: auctions.winnerId,
      myHighest: sql<number>`max(${bids.amount})::int`,
    })
    .from(bids)
    .innerJoin(auctions, eq(bids.auctionId, auctions.id))
    .where(eq(bids.bidderId, userId))
    .groupBy(auctions.id)
    .orderBy(desc(sql`max(${bids.createdAt})`));

  // 3. Gewonnene Artikel (Zahlungsfokus): über orders.buyerId (bleibt auch bei
  // abgelaufener Frist erhalten — winnerId wird dann zurückgesetzt).
  const won = await db
    .select({
      auctionId: auctions.id,
      title: auctions.title,
      orderId: orders.id,
      orderStatus: orders.status,
      amount: orders.amount,
      paymentDueAt: orders.paymentDueAt,
    })
    .from(orders)
    .innerJoin(auctions, eq(orders.auctionId, auctions.id))
    .where(eq(orders.buyerId, userId))
    .orderBy(desc(orders.createdAt));

  // === Status-Ableitung (server-seitig, status ist Quelle der Wahrheit) ===

  function sellingStatus(a: (typeof selling)[number]): {
    key: string;
    badge: Badge;
  } {
    if (a.status === "active") return {key: "active", badge: "accent"};
    if (a.orderStatus === "paid") return {key: "sold", badge: "success"};
    if (a.orderStatus === "pending")
      return {key: "awaitingPayment", badge: "accent"};
    // beendet ohne (bezahlte/offene) Order: kein Gewinner oder Frist abgelaufen
    return {key: "unsold", badge: "muted"};
  }

  function biddingStatus(a: (typeof bidding)[number]): {
    key: string;
    badge: Badge;
  } {
    if (a.status === "active") {
      // currentPrice = Betrag des aktuell höchsten Gebots
      return a.myHighest >= a.currentPrice
        ? {key: "leading", badge: "success"}
        : {key: "outbid", badge: "danger"};
    }
    return a.winnerId === userId
      ? {key: "won", badge: "success"}
      : {key: "lost", badge: "muted"};
  }

  function wonStatus(o: (typeof won)[number]): {key: string; badge: Badge} {
    if (o.orderStatus === "paid") return {key: "paid", badge: "success"};
    if (o.orderStatus === "expired") return {key: "expired", badge: "muted"};
    return {key: "toPay", badge: "accent"};
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1>{t("title")}</h1>
        <p className={styles.welcome}>{t("welcome", {name: session.user.name})}</p>
      </header>

      {/* 1. Meine Auktionen */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("selling.title")}</h2>
        {selling.length === 0 ? (
          <p className={styles.empty}>{t("selling.empty")}</p>
        ) : (
          <ul className={styles.list}>
            {selling.map((a) => {
              const s = sellingStatus(a);
              return (
                <li key={a.id} className={`card ${styles.row}`}>
                  <div className={styles.main}>
                    <Link href={`/auctions/${a.id}`} className={styles.rowTitle}>
                      {a.title}
                    </Link>
                    <p className={styles.meta}>
                      <span>{euro(a.currentPrice)}</span>
                      <span className={styles.dot}>·</span>
                      <span>{t("selling.bids", {count: a.bidCount})}</span>
                    </p>
                  </div>
                  <span className={`${styles.badge} ${styles[s.badge]}`}>
                    {t(`selling.status.${s.key}`)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 2. Meine Gebote */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("bidding.title")}</h2>
        {bidding.length === 0 ? (
          <p className={styles.empty}>{t("bidding.empty")}</p>
        ) : (
          <ul className={styles.list}>
            {bidding.map((a) => {
              const s = biddingStatus(a);
              return (
                <li key={a.id} className={`card ${styles.row}`}>
                  <div className={styles.main}>
                    <Link href={`/auctions/${a.id}`} className={styles.rowTitle}>
                      {a.title}
                    </Link>
                    <p className={styles.meta}>
                      <span>
                        {t("bidding.yourBid")}: <strong>{euro(a.myHighest)}</strong>
                      </span>
                      <span className={styles.dot}>·</span>
                      <span>
                        {t("bidding.currentBid")}: {euro(a.currentPrice)}
                      </span>
                    </p>
                  </div>
                  <span className={`${styles.badge} ${styles[s.badge]}`}>
                    {t(`bidding.status.${s.key}`)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 3. Gewonnene Artikel */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("won.title")}</h2>
        {won.length === 0 ? (
          <p className={styles.empty}>{t("won.empty")}</p>
        ) : (
          <ul className={styles.list}>
            {won.map((o) => {
              const s = wonStatus(o);
              return (
                <li key={o.orderId} className={`card ${styles.row}`}>
                  <div className={styles.main}>
                    <Link
                      href={`/auctions/${o.auctionId}`}
                      className={styles.rowTitle}
                    >
                      {o.title}
                    </Link>
                    <p className={styles.meta}>
                      <span>
                        {t("won.amount")}: <strong>{euro(o.amount)}</strong>
                      </span>
                      {o.orderStatus === "pending" && (
                        <>
                          <span className={styles.dot}>·</span>
                          <span>
                            {t("won.payBy", {
                              date: format.dateTime(o.paymentDueAt, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }),
                            })}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <span className={`${styles.badge} ${styles[s.badge]}`}>
                      {t(`won.status.${s.key}`)}
                    </span>
                    {o.orderStatus === "pending" && (
                      <PayButton orderId={o.orderId} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
