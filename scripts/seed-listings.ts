/**
 * Seed-Skript: legt Test-Anzeigen an (3 pro Kategorie, gemischte Typen) für den
 * Account `leon-rabl@web.de`. Ausführen mit `pnpm db:seed`.
 *
 * - Alle Anzeigen: status='active', OHNE Bild (imageUrl null), kein Käufer/Gewinner.
 * - Auktionen laufen über ein halbes Jahr (endsAt ~6,5–10 Monate in der Zukunft).
 * - Beträge werden in Cent gespeichert (Konvention).
 * - Idempotent: vorhandene Seed-Anzeigen (Marker in der Beschreibung) werden vor
 *   dem Neu-Anlegen entfernt, damit ein erneuter Lauf nicht dupliziert.
 *
 * Setzt die "Bilder optional"-Änderung voraus (image_url nullable).
 */
import {config} from "dotenv";
import {and, eq, like} from "drizzle-orm";
import {auctions, user} from "../src/lib/db/schema";

// .env.local laden, BEVOR die DB-Verbindung (src/lib/db) importiert wird —
// diese liest DATABASE_URL beim Modul-Load und wirft sonst.
config({path: ".env.local"});

const SELLER_EMAIL = "leon-rabl@web.de";
// Erkennungsmerkmal in der Beschreibung, um Seed-Anzeigen später zu finden/löschen.
const MARKER = "Vault-Seed";

const DAY = 24 * 60 * 60 * 1000;

type Kind = "auction" | "fixed" | "both";
type Item = {
  title: string;
  description: string;
  kind: Kind;
  eur: number; // Startpreis (auction/both) bzw. Festpreis (fixed)
  buyNowEur?: number; // nur bei kind === "both"
};

// Je Kategorie 3 Anzeigen: 1× reine Auktion, 1× reiner Festpreis, 1× beides.
const CATALOG: {slug: string; items: [Item, Item, Item]}[] = [
  {
    slug: "autos_motorraeder",
    items: [
      {
        kind: "auction",
        eur: 18500,
        title: "Mercedes-Benz 280 SL Pagode (1969)",
        description:
          "Restaurierter Klassiker in Silber, Hardtop und Verdeck vorhanden. Scheckheftgepflegt und fahrbereit.",
      },
      {
        kind: "fixed",
        eur: 9800,
        title: "BMW R80 Motorrad, restauriert",
        description:
          "Boxer-Motor komplett überholt, neue Reifen und Auspuffanlage. Läuft einwandfrei im Originalzustand.",
      },
      {
        kind: "both",
        eur: 14500,
        buyNowEur: 21000,
        title: "VW Käfer 1303 Cabrio, Oldtimer",
        description:
          "Frisch lackiertes Cabrio mit neuem Verdeck, TÜV neu. Ein echter Hingucker für Sammler.",
      },
    ],
  },
  {
    slug: "muenzen_briefmarken",
    items: [
      {
        kind: "auction",
        eur: 120,
        title: "Silbermünze 5 Mark Deutsches Reich 1908",
        description:
          "Echtes Silber (900), Erhaltung sehr schön. Aus einer alten Nachlass-Sammlung.",
      },
      {
        kind: "fixed",
        eur: 340,
        title: "Briefmarken-Sammlung Deutsches Reich, Album",
        description:
          "Umfangreiches Album mit gestempelten und ungestempelten Marken aus mehreren Jahrzehnten.",
      },
      {
        kind: "both",
        eur: 650,
        buyNowEur: 950,
        title: "Goldmünze 20 Mark Wilhelm II 1895",
        description:
          "900er Gold, 7,16 g. Beliebtes Sammlerstück in guter Erhaltung.",
      },
    ],
  },
  {
    slug: "schmuck",
    items: [
      {
        kind: "auction",
        eur: 3800,
        title: "Vintage Rolex Datejust Herrenuhr",
        description:
          "Edelstahl, Automatikwerk, läuft präzise. Mit Box, ohne Papiere.",
      },
      {
        kind: "fixed",
        eur: 1450,
        title: "Brillantring 0,75 ct, 750er Weißgold",
        description:
          "Klassischer Solitär mit lupenreinem Brillant. Innenmaß 54, inklusive Gutachten.",
      },
      {
        kind: "both",
        eur: 480,
        buyNowEur: 720,
        title: "Perlenkette Akoya mit Goldschließe",
        description:
          "Handgeknüpfte Akoya-Zuchtperlen, 45 cm, Schließe aus 585er Gold.",
      },
    ],
  },
  {
    slug: "einrichtung",
    items: [
      {
        kind: "auction",
        eur: 145,
        title: "Messing-Tischlampe, Mid-Century",
        description:
          "Originale Tischleuchte der 1960er, neu verkabelt. Warmes Licht und schöne Patina.",
      },
      {
        kind: "fixed",
        eur: 890,
        title: "Eames-Style Lounge Chair, Leder",
        description:
          "Bequemer Loungesessel mit Hocker, Echtleder in Cognac, Schichtholz-Schalen.",
      },
      {
        kind: "both",
        eur: 420,
        buyNowEur: 680,
        title: "Teak-Sideboard, dänisches Design 60er",
        description:
          "Skandinavisches Sideboard mit Schiebetüren, massives Teak, fachgerecht restauriert.",
      },
    ],
  },
  {
    slug: "kunst",
    items: [
      {
        kind: "auction",
        eur: 650,
        title: "Ölgemälde Landschaft, signiert",
        description:
          "Stimmungsvolle Landschaft in Öl auf Leinwand, signiert und gerahmt.",
      },
      {
        kind: "fixed",
        eur: 1200,
        title: "Bronzeskulptur, abstrakte Figur",
        description:
          "Massive Bronze in limitierter Auflage, auf Steinsockel montiert.",
      },
      {
        kind: "both",
        eur: 230,
        buyNowEur: 390,
        title: "Aquarell Stadtansicht, gerahmt",
        description:
          "Feines Aquarell einer Altstadtgasse, hinter Glas gerahmt.",
      },
    ],
  },
  {
    slug: "mode",
    items: [
      {
        kind: "auction",
        eur: 280,
        title: "Hermès Seidentuch Carré",
        description:
          "Original Carré 90×90, reine Seide, mit Box. Sehr guter Zustand.",
      },
      {
        kind: "fixed",
        eur: 520,
        title: "Burberry Trenchcoat, Gr. 38",
        description:
          "Klassischer Trench in Beige, Baumwolle mit herausnehmbarem Innenfutter.",
      },
      {
        kind: "both",
        eur: 640,
        buyNowEur: 980,
        title: "Louis Vuitton Handtasche Speedy 30",
        description:
          "Monogram Canvas, gepflegt, mit Schloss und Schlüssel.",
      },
    ],
  },
  {
    slug: "elektronik",
    items: [
      {
        kind: "auction",
        eur: 420,
        title: "Technics SL-1210 Plattenspieler",
        description:
          "Legendärer Direktantrieb-Turntable, voll funktionsfähig, neue Nadel.",
      },
      {
        kind: "fixed",
        eur: 2400,
        title: "Leica M6 Messsucherkamera",
        description:
          "Analoge Kult-Kamera, mechanisch top, Belichtungsmesser funktioniert.",
      },
      {
        kind: "both",
        eur: 180,
        buyNowEur: 320,
        title: "Marantz Stereo-Receiver, Vintage",
        description:
          "Warmer Klang der 70er, alle Kanäle sauber, Holzgehäuse.",
      },
    ],
  },
  {
    slug: "buecher_geschichte",
    items: [
      {
        kind: "auction",
        eur: 180,
        title: "Antiquarisches Lexikon, 12 Bände",
        description:
          "Vollständige Ausgabe in Halbleder, gut erhalten, mit Goldschnitt.",
      },
      {
        kind: "fixed",
        eur: 240,
        title: "Erstausgabe Roman, gebunden 1925",
        description:
          "Seltene Erstausgabe im Leineneinband, leichte Gebrauchsspuren.",
      },
      {
        kind: "both",
        eur: 60,
        buyNowEur: 110,
        title: "Historische Landkarten-Sammlung, gerahmt",
        description:
          "Drei kolorierte Karten des 19. Jahrhunderts, jeweils gerahmt.",
      },
    ],
  },
  {
    slug: "pflanzen",
    items: [
      {
        kind: "auction",
        eur: 85,
        title: "Monstera Variegata, große Pflanze",
        description:
          "Kräftig panaschierte Monstera mit mehreren Blättern, robust und gesund.",
      },
      {
        kind: "fixed",
        eur: 140,
        title: "Bonsai, japanischer Ahorn, 15 Jahre",
        description:
          "Gut gestalteter Acer palmatum mit schöner Verzweigung, inklusive Schale.",
      },
      {
        kind: "both",
        eur: 35,
        buyNowEur: 60,
        title: "Philodendron Pink Princess, bewurzelt",
        description:
          "Beliebte Rarität mit rosa Panaschierung, gut bewurzelter Ableger.",
      },
    ],
  },
  {
    slug: "sonstiges",
    items: [
      {
        kind: "auction",
        eur: 90,
        title: "Vintage Reiseschreibmaschine",
        description:
          "Mechanische Reiseschreibmaschine im Koffer, funktionsfähig, Farbband neu.",
      },
      {
        kind: "fixed",
        eur: 160,
        title: "Mechanische Wanduhr mit Pendel",
        description:
          "Pendelwerk mit Schlag, läuft zuverlässig, schönes Holzgehäuse.",
      },
      {
        kind: "both",
        eur: 70,
        buyNowEur: 120,
        title: "Sammler-Globus, beleuchtet, 60er",
        description:
          "Beleuchteter Globus auf Metallfuß mit Vintage-Charme, funktioniert.",
      },
    ],
  },
];

const cents = (eur: number) => Math.round(eur * 100);

async function main() {
  // DB-Verbindung erst hier laden (nach config()), damit DATABASE_URL gesetzt ist.
  const {db} = await import("../src/lib/db");

  const [seller] = await db
    .select({id: user.id})
    .from(user)
    .where(eq(user.email, SELLER_EMAIL))
    .limit(1);

  if (!seller) {
    console.error(
      `❌ Kein Nutzer mit E-Mail "${SELLER_EMAIL}" gefunden.\n   Bitte den Account "${SELLER_EMAIL}" zuerst über die App registrieren.`,
    );
    process.exit(1);
  }

  // Idempotenz: bisherige Seed-Anzeigen dieses Nutzers entfernen.
  const removed = await db
    .delete(auctions)
    .where(
      and(
        eq(auctions.sellerId, seller.id),
        like(auctions.description, `%${MARKER}%`),
      ),
    )
    .returning({id: auctions.id});
  if (removed.length > 0) {
    console.log(`🧹 ${removed.length} vorhandene Seed-Anzeigen entfernt.`);
  }

  const now = Date.now();
  let n = 0;

  const rows = CATALOG.flatMap((cat) =>
    cat.items.map((item) => {
      n++;
      const isAuction = item.kind === "auction" || item.kind === "both";
      const hasBuyNow = item.kind === "fixed" || item.kind === "both";
      const startPrice = isAuction ? cents(item.eur) : null;
      const buyNowPrice = hasBuyNow
        ? cents(item.kind === "both" ? item.buyNowEur! : item.eur)
        : null;

      return {
        sellerId: seller.id,
        title: item.title,
        // Marker in der Beschreibung → später leicht auffindbar/löschbar.
        description: `${item.description}\n\n(${MARKER}-Testanzeige)`,
        category: cat.slug,
        imageUrl: null, // bewusst ohne Bild
        startPrice,
        currentPrice: startPrice, // Startgebot = Startpreis (null ohne Auktion)
        // Auktionen laufen über ein halbes Jahr (~6,5–10 Monate in der Zukunft).
        endsAt: isAuction ? new Date(now + (195 + n * 4) * DAY) : null,
        buyNowPrice,
        status: "active" as const,
      };
    }),
  );

  await db.insert(auctions).values(rows);

  console.log(
    `✅ ${rows.length} Test-Anzeigen für "${SELLER_EMAIL}" angelegt ` +
      `(${CATALOG.length} Kategorien × 3, alle aktiv, ohne Bild).`,
  );
  console.log(
    `   Löschen später z. B. über: description LIKE '%${MARKER}%' (sellerId = ${seller.id}).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
