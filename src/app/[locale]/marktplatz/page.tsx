import type {Metadata} from "next";
import {and, desc, eq, gt, ilike, isNull, or, sql} from "drizzle-orm";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {auctions, bids, db} from "@/lib/db";
import {isCategorySlug} from "@/lib/categories";
import {DEFAULT_SORT, isSortKey, type SortKey} from "@/lib/marktplatz-sort";
import {Link} from "@/i18n/navigation";
import AuctionCard from "@/components/AuctionCard";
import SearchBar from "@/components/SearchBar";
import SortSelect from "@/components/SortSelect";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<{kategorie?: string; q?: string; sort?: string}>;
};

// orderBy-Klausel je Sortier-Option. Effektiver Preis = currentPrice (Auktion)
// sonst buyNowPrice (Festpreis); "endet bald" stellt Festpreis-Anzeigen (kein
// endsAt) ans Ende. createdAt dient als stabiler Tiebreaker.
function orderByFor(sort: SortKey) {
  switch (sort) {
    case "ending-soon":
      return [sql`${auctions.endsAt} asc nulls last`, desc(auctions.createdAt)];
    case "price-asc":
      return [sql`coalesce(${auctions.currentPrice}, ${auctions.buyNowPrice}) asc`];
    case "price-desc":
      return [sql`coalesce(${auctions.currentPrice}, ${auctions.buyNowPrice}) desc`];
    default:
      return [desc(auctions.createdAt)];
  }
}

// LIKE-Sonderzeichen escapen, damit Nutzereingaben nicht als Wildcards wirken
// (Standard-Escape-Zeichen \ von Postgres ILIKE).
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Marktplatz"});
  return {title: t("title")};
}

export default async function AuctionsPage({params, searchParams}: Props) {
  const {locale} = await params;
  const {kategorie, q, sort} = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("Auctions");

  // Optionaler Kategorie-Filter aus dem Search-Param (ungültige Slugs ignorieren)
  const category = isCategorySlug(kategorie) ? kategorie : null;
  // Optionaler Suchbegriff (?q=) — case-insensitive auf Titel UND Beschreibung.
  const query = q?.trim() ?? "";
  // Sortierung aus ?sort= (ungültig/fehlend -> Standard "newest").
  const sortKey = isSortKey(sort) ? sort : DEFAULT_SORT;
  const hasFilters = Boolean(category || query);

  // Aktive Anzeigen, neueste zuerst. Auktionen nur, solange nicht abgelaufen;
  // reine Festpreis-Anzeigen (endsAt == null) laufen nie ab und bleiben sichtbar.
  // Kategorie- und Suchfilter werden UND-verknüpft.
  const list = await db
    .select({
      id: auctions.id,
      title: auctions.title,
      imageUrl: auctions.imageUrl,
      category: auctions.category,
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
        category ? eq(auctions.category, category) : undefined,
        query
          ? or(
              ilike(auctions.title, `%${escapeLike(query)}%`),
              ilike(auctions.description, `%${escapeLike(query)}%`),
            )
          : undefined,
      ),
    )
    .groupBy(auctions.id)
    .orderBy(...orderByFor(sortKey));

  return (
    <div className={styles.page}>
      <h1>{t("list.title")}</h1>

      <div className={styles.toolbar}>
        <SearchBar />
        <SortSelect />
      </div>

      {list.length === 0 ? (
        <div className={styles.empty}>
          <p>{hasFilters ? t("list.emptyFiltered") : t("list.empty")}</p>
          {hasFilters && (
            <Link href="/marktplatz" className="btn">
              {t("list.reset")}
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className={styles.count}>
            {t("list.count", {count: list.length})}
          </p>
          <div className={styles.grid}>
            {list.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
