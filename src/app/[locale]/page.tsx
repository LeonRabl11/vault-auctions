import {and, desc, eq, gt, isNull, or, sql} from "drizzle-orm";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {auctions, bids, db} from "@/lib/db";
import {Link} from "@/i18n/navigation";
import AuctionCard from "@/components/AuctionCard";
import Reveal from "@/components/Reveal";
import styles from "./page.module.scss";

type Props = {
  params: Promise<{locale: string}>;
};

// Kleine Inline-SVG-Icons für "So funktioniert's" (kein Icon-Paket).
const STEP_ICONS = [
  // Stöbern — Lupe
  <svg key="browse" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path
      d="M21 21l-4.3-4.3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>,
  // Bieten — steigende Kurve
  <svg key="bid" viewBox="0 0 24 24" fill="none" aria-hidden>
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
  </svg>,
  // Gewinnen & bezahlen — Pokal
  <svg key="win" viewBox="0 0 24 24" fill="none" aria-hidden>
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
  </svg>,
];

export default async function Home({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  const t = await getTranslations("HomePage");

  // Neueste aktive Anzeigen (wie die Übersicht, limitiert). Auktionen nur solange
  // laufend; reine Festpreis-Anzeigen (endsAt == null) bleiben sichtbar.
  const latest = await db
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
    .orderBy(desc(auctions.createdAt))
    .limit(6);

  const steps = [0, 1, 2].map((i) => ({
    icon: STEP_ICONS[i],
    title: t(`how.step${i + 1}.title`),
    text: t(`how.step${i + 1}.text`),
  }));

  const features = [1, 2, 3].map((i) => ({
    title: t(`features.item${i}.title`),
    text: t(`features.item${i}.text`),
  }));

  return (
    <div className={styles.page}>
      {/* 1. Hero — klarer Einstieg mit Bild-Hintergrund + dunklem Scrim */}
      <Reveal>
        <section className={`${styles.section} ${styles.hero}`}>
          <h1 className={styles.headline}>{t("hero.headline")}</h1>
          <p className={styles.subline}>{t("hero.subline")}</p>
          <div className={styles.ctas}>
            <Link href="/marktplatz" className="btn btn--primary">
              {t("hero.ctaPrimary")}
            </Link>
            <Link href="/marktplatz/new" className={`btn ${styles.secondaryBtn}`}>
              {t("hero.ctaSecondary")}
            </Link>
          </div>
        </section>
      </Reveal>

      {/* 2. Aktuelle Auktionen — anschaulicher Kern */}
      <Reveal>
        <section className={styles.section}>
          <header className={styles.sectionHead}>
            <div className={styles.heading}>
              <p className={styles.eyebrow}>{t("auctions.eyebrow")}</p>
              <h2 className={styles.title}>{t("auctions.title")}</h2>
            </div>
            <Link href="/marktplatz" className={styles.viewAll}>
              {t("auctions.viewAll")} →
            </Link>
          </header>
          {latest.length === 0 ? (
            <p className={styles.empty}>{t("auctions.empty")}</p>
          ) : (
            <div className={styles.grid}>
              {latest.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* 3. So funktioniert's */}
      <Reveal>
        <section className={`${styles.section} ${styles.surface}`}>
          <header className={styles.sectionHead}>
            <div className={styles.heading}>
              <p className={styles.eyebrow}>{t("how.eyebrow")}</p>
              <h2 className={styles.title}>{t("how.title")}</h2>
            </div>
          </header>
          <ol className={styles.steps}>
            {steps.map((step, i) => (
              <li key={i} className={styles.step}>
                <span className={styles.stepIcon}>{step.icon}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      {/* 4. Stärken / Info (rein informativ, kein CTA) */}
      <Reveal>
        <section className={styles.section}>
          <header className={styles.sectionHead}>
            <div className={styles.heading}>
              <p className={styles.eyebrow}>{t("features.eyebrow")}</p>
              <h2 className={styles.title}>{t("features.title")}</h2>
              <p className={styles.intro}>{t("features.intro")}</p>
            </div>
          </header>
          <ul className={styles.featureList}>
            {features.map((feature, i) => (
              <li key={i} className={`card ${styles.feature}`}>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureText}>{feature.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>
    </div>
  );
}
