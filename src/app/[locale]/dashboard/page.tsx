import type {ReactNode} from "react";
import {headers} from "next/headers";
import {and, desc, eq, notExists, sql} from "drizzle-orm";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import {auth} from "@/lib/auth";
import {auctions, bids, db, dismissals, orders} from "@/lib/db";
import {Link, redirect} from "@/i18n/navigation";
import PayButton from "@/components/PayButton";
import DismissButton from "@/components/DismissButton";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{locale: string}>;
};

// Badge-Variante (Farbe) je Statuskategorie — Mapping an einer Stelle.
type Badge = "success" | "danger" | "warning" | "accent" | "muted";

// Inline-SVG-Icons für die Empty-States (kein Icon-Paket), Stil wie Homepage.
const EMPTY_ICONS: Record<"selling" | "bidding" | "won", ReactNode> = {
  selling: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.5 12.5l9-9H20v7.5l-9 9z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="15.5" cy="8.5" r="1.4" fill="currentColor" />
    </svg>
  ),
  bidding: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 17l6-6 4 4 8-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 7h6v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  won: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 4h10v4a5 5 0 0 1-10 0V4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 21h6M12 17v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

// Monogramm-Thumbnail aus dem Titel (kein Bild nötig → keine zusätzliche Query).
function initial(title: string): string {
  return title.trim().charAt(0).toUpperCase() || "?";
}

function EmptyState({
  icon,
  text,
  href,
  cta,
}: {
  icon: ReactNode;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>{icon}</span>
      <p className={styles.emptyText}>{text}</p>
      <Link href={href} className={styles.emptyLink}>
        {cta} →
      </Link>
    </div>
  );
}

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

  // Vom Nutzer im jeweiligen Bereich ausgeblendete Anzeigen herausfiltern.
  const notDismissed = (section: "bidding" | "won") =>
    notExists(
      db
        .select({one: sql`1`})
        .from(dismissals)
        .where(
          and(
            eq(dismissals.userId, userId),
            eq(dismissals.auctionId, auctions.id),
            eq(dismissals.section, section),
          ),
        ),
    );

  // === Queries (je Bereich eine, Aggregate statt N+1) ===

  // 1. Meine Auktionen (Verkäufer): + Gebotsanzahl (count) + Order-Status (join)
  const selling = await db
    .select({
      id: auctions.id,
      title: auctions.title,
      status: auctions.status,
      currentPrice: auctions.currentPrice,
      buyNowPrice: auctions.buyNowPrice,
      endsAt: auctions.endsAt,
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
    .where(and(eq(bids.bidderId, userId), notDismissed("bidding")))
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
    .where(and(eq(orders.buyerId, userId), notDismissed("won")))
    .orderBy(desc(orders.createdAt));

  // === Status-Ableitung (server-seitig, status ist Quelle der Wahrheit) ===

  function sellingStatus(a: (typeof selling)[number]): {
    key: string;
    badge: Badge;
  } {
    if (a.status === "active") return {key: "active", badge: "accent"};
    if (a.orderStatus === "paid") return {key: "sold", badge: "success"};
    if (a.orderStatus === "pending")
      return {key: "awaitingPayment", badge: "warning"};
    // beendet ohne (bezahlte/offene) Order: kein Gewinner oder Frist abgelaufen
    return {key: "unsold", badge: "muted"};
  }

  function biddingStatus(a: (typeof bidding)[number]): {
    key: string;
    badge: Badge;
  } {
    if (a.status === "active") {
      // currentPrice = Betrag des aktuell höchsten Gebots (bei Auktionen gesetzt)
      return a.myHighest >= (a.currentPrice ?? 0)
        ? {key: "leading", badge: "success"}
        : {key: "outbid", badge: "warning"};
    }
    return a.winnerId === userId
      ? {key: "won", badge: "success"}
      : {key: "lost", badge: "muted"};
  }

  function wonStatus(o: (typeof won)[number]): {key: string; badge: Badge} {
    if (o.orderStatus === "paid") return {key: "paid", badge: "success"};
    if (o.orderStatus === "expired") return {key: "expired", badge: "muted"};
    return {key: "toPay", badge: "warning"};
  }

  // === Übersicht: Kennzahlen aus den bereits geladenen Daten (keine Extra-Query) ===
  const stats = [
    {
      value: selling.filter((a) => a.status === "active").length,
      label: t("stats.activeAuctions"),
    },
    {
      value: bidding.filter((a) => a.status === "active").length,
      label: t("stats.activeBids"),
    },
    {value: won.length, label: t("stats.wonItems")},
  ];

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <h1>{t("title")}</h1>
          <p className={styles.welcome}>
            {t("welcome", {name: session.user.name})}
          </p>
        </div>
        <Link href="/marktplatz/new" className="btn btn--primary">
          {t("newAuction")}
        </Link>
      </header>

      {/* Übersicht / Stat-Cards */}
      <div className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label} className={`card ${styles.stat}`}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* 1. Meine Auktionen */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("selling.title")}</h2>
          <span className={styles.count}>({selling.length})</span>
        </div>
        {selling.length === 0 ? (
          <EmptyState
            icon={EMPTY_ICONS.selling}
            text={t("selling.empty")}
            href="/marktplatz/new"
            cta={t("selling.emptyCta")}
          />
        ) : (
          <ul className={styles.list}>
            {selling.map((a) => {
              const s = sellingStatus(a);
              // Auktion -> aktuelles Höchstgebot; reine Festpreis-Anzeige -> Festpreis
              const isAuction = a.endsAt != null;
              const price = isAuction
                ? (a.currentPrice ?? 0)
                : (a.buyNowPrice ?? 0);
              return (
                <li key={a.id} className={`card ${styles.row}`}>
                  <span className={styles.thumb} aria-hidden>
                    {initial(a.title)}
                  </span>
                  <div className={styles.main}>
                    <Link href={`/marktplatz/${a.id}`} className={styles.rowTitle}>
                      {a.title}
                    </Link>
                    <p className={styles.meta}>
                      <span>{euro(price)}</span>
                      {isAuction && (
                        <>
                          <span className={styles.dot}>·</span>
                          <span>{t("selling.bids", {count: a.bidCount})}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className={styles.trailing}>
                    <span className={`${styles.badge} ${styles[s.badge]}`}>
                      {t(`selling.status.${s.key}`)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 2. Meine Gebote */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("bidding.title")}</h2>
          <span className={styles.count}>({bidding.length})</span>
        </div>
        {bidding.length === 0 ? (
          <EmptyState
            icon={EMPTY_ICONS.bidding}
            text={t("bidding.empty")}
            href="/marktplatz"
            cta={t("bidding.emptyCta")}
          />
        ) : (
          <ul className={styles.list}>
            {bidding.map((a) => {
              const s = biddingStatus(a);
              return (
                <li key={a.id} className={`card ${styles.row}`}>
                  <span className={styles.thumb} aria-hidden>
                    {initial(a.title)}
                  </span>
                  <div className={styles.main}>
                    <Link href={`/marktplatz/${a.id}`} className={styles.rowTitle}>
                      {a.title}
                    </Link>
                    <p className={styles.meta}>
                      <span>
                        {t("bidding.yourBid")}:{" "}
                        <strong>{euro(a.myHighest)}</strong>
                      </span>
                      <span className={styles.dot}>·</span>
                      <span>
                        {t("bidding.currentBid")}: {euro(a.currentPrice ?? 0)}
                      </span>
                    </p>
                  </div>
                  <div className={styles.trailing}>
                    <span className={`${styles.badge} ${styles[s.badge]}`}>
                      {t(`bidding.status.${s.key}`)}
                    </span>
                    {a.status !== "active" && (
                      <DismissButton auctionId={a.id} section="bidding" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 3. Gewonnene Artikel */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("won.title")}</h2>
          <span className={styles.count}>({won.length})</span>
        </div>
        {won.length === 0 ? (
          <EmptyState
            icon={EMPTY_ICONS.won}
            text={t("won.empty")}
            href="/marktplatz"
            cta={t("won.emptyCta")}
          />
        ) : (
          <ul className={styles.list}>
            {won.map((o) => {
              const s = wonStatus(o);
              return (
                <li key={o.orderId} className={`card ${styles.row}`}>
                  <span className={styles.thumb} aria-hidden>
                    {initial(o.title)}
                  </span>
                  <div className={styles.main}>
                    <Link
                      href={`/marktplatz/${o.auctionId}`}
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
                  <div className={styles.trailing}>
                    <span className={`${styles.badge} ${styles[s.badge]}`}>
                      {t(`won.status.${s.key}`)}
                    </span>
                    {o.orderStatus === "pending" ? (
                      <PayButton orderId={o.orderId} />
                    ) : (
                      <DismissButton auctionId={o.auctionId} section="won" />
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
