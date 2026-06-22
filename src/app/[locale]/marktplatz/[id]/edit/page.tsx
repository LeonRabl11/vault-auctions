import {headers} from "next/headers";
import {notFound} from "next/navigation";
import {eq, sql} from "drizzle-orm";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {auctions, bids, db} from "@/lib/db";
import {auth} from "@/lib/auth";
import {redirect} from "@/i18n/navigation";
import AuctionForm, {type AuctionFormInitial} from "@/components/AuctionForm";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{locale: string; id: string}>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// € aus Cent als Eingabe-String (null -> leeres Feld).
const eurField = (cents: number | null) =>
  cents != null ? (cents / 100).toString() : "";

export default async function EditAuctionPage({params}: Props) {
  const {locale, id} = await params;
  setRequestLocale(locale);

  if (!UUID_RE.test(id)) {
    notFound();
  }

  // Echte, serverseitige Session-Prüfung
  const session = await auth.api.getSession({headers: await headers()});
  if (!session) {
    redirect({href: "/login", locale});
    return null;
  }

  const [row] = await db
    .select({
      title: auctions.title,
      description: auctions.description,
      category: auctions.category,
      imageUrl: auctions.imageUrl,
      startPrice: auctions.startPrice,
      endsAt: auctions.endsAt,
      buyNowPrice: auctions.buyNowPrice,
      status: auctions.status,
      sellerId: auctions.sellerId,
      bidCount: sql<number>`count(${bids.id})::int`,
    })
    .from(auctions)
    .leftJoin(bids, eq(bids.auctionId, auctions.id))
    .where(eq(auctions.id, id))
    .groupBy(auctions.id)
    .limit(1);

  // Nicht vorhanden oder nicht der Eigentümer -> Existenz nicht preisgeben.
  if (!row || row.sellerId !== session.user.id) {
    notFound();
  }

  // Nur aktive Anzeigen sind bearbeitbar — sonst zurück zur Detailseite.
  if (row.status !== "active") {
    redirect({href: `/marktplatz/${id}`, locale});
    return null;
  }

  const t = await getTranslations("Auctions");

  const initial: AuctionFormInitial = {
    title: row.title,
    description: row.description,
    category: row.category,
    startPriceEur: eurField(row.startPrice),
    endsAtIso: row.endsAt ? row.endsAt.toISOString() : null,
    buyNowPriceEur: eurField(row.buyNowPrice),
    imageUrl: row.imageUrl,
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1>{t("edit.title")}</h1>
        <p className={styles.subline}>{t("edit.subline")}</p>
      </header>
      <div className="card">
        <AuctionForm
          mode="edit"
          auctionId={id}
          initial={initial}
          pricingLocked={row.bidCount > 0}
        />
      </div>
    </div>
  );
}
