# CLAUDE.md — Auktionsplattform

## Projekt
eBay-inspirierte Auktionsplattform (Portfolio-Projekt): Artikel einstellen, bieten,
Höchstbietender gewinnt bei Ablauf und bezahlt — **oder** zum Festpreis sofort kaufen.
Eine Anzeige ist Auktion, Festpreis oder beides. Vollständige Spec, Datenmodell und
Phasen-Roadmap: **docs/KONZEPT.md** (Langfassung — nicht hierher kopieren).

## Tech-Stack
- **Next.js 16.2.9** (App Router, Turbopack) + **React 19.2.4**
- **TypeScript** (strict), Pfad-Alias `@/*` → `./src/*`
- **Styling: SCSS** (Next.js built-in Sass, `sass ^1.100.0`) — **kein Tailwind**
- **Icons: lucide-react** (Outline, tree-shakeable)
- **ESLint 9** (Flat Config: `eslint-config-next` core-web-vitals + typescript)
- **pnpm** (Package Manager)
- **i18n: next-intl 4** (`de` default ohne Prefix, `en` unter `/en`)
- **DB: Drizzle ORM 0.45 + PostgreSQL** (Supabase als reine DB, Treiber `postgres`)
- **Auth: Better Auth 1.6** (E-Mail + Passwort, JWT/Session, Drizzle-Adapter) — **nicht** NextAuth
- Geplant (lt. Konzept, noch nicht installiert): Stripe, AWS S3, Brevo

## Befehle
- `pnpm dev` — Dev-Server (Turbopack)
- `pnpm build` — Production-Build
- `pnpm start` — Production-Server
- `pnpm lint` — ESLint
- `pnpm test` — Vitest, schnelle Unit-Tests (einmalig); `pnpm test:watch` — Watch
- `pnpm test:db` — Integrationstests gegen die Test-DB (braucht `TEST_DATABASE_URL`)
- `pnpm db:generate` — Migration aus Schema generieren (offline)
- `pnpm db:migrate` — Migrationen auf die DB anwenden (braucht `DATABASE_URL`)
- `pnpm db:push` — Schema direkt pushen (Prototyping)
- `pnpm db:studio` — Drizzle Studio

## Struktur (src/)
- `app/[locale]/` — App Router mit i18n-Routing (Layout rendert `<html lang>`, Pages)
- `components/` — wiederverwendbare React-Komponenten (z. B. `LocaleSwitcher`)
- `i18n/` — next-intl-Config (`routing.ts`, `request.ts`, `navigation.ts`)
- `lib/db/` — Drizzle: `schema.ts` (Domain-Tabellen), `auth-schema.ts` (Better-Auth-Tabellen, generiert), `index.ts` (Connection `db`)
- `lib/auth.ts` — Better-Auth-Server-Instanz; `lib/auth-client.ts` — Client (`authClient`)
- `lib/categories.ts` — Single Source of Truth für Kategorien (`slug`/`icon`/`labelKey`)
- `app/api/auth/[...all]/` — Better-Auth-Route-Handler
- `app/[locale]/marktplatz/` — Anzeigen: Liste (Index, Kategorie-Filter via `?kategorie=`), `[id]` (Detail), `new` (erstellen)
- `app/[locale]/{login,register,dashboard}/` — Auth-Seiten (dashboard ist geschützt)
- `components/CategoryBar.tsx` — Kategorie-Leiste unter dem Header (filtert den Marktplatz)
- `lib/` — sonstige Utilities / Server-Logik (Validierung, Helpers)
- `styles/` — `_variables.scss` (Partial), `globals.scss` (global)
- `proxy.ts` — next-intl Locale-Routing **+** Better-Auth-Schutz (Next-16-Konvention statt `middleware.ts`)
- Außerhalb `src/`: `messages/de.json` + `messages/en.json` (ICU), `drizzle/` (Migrationen)

## Konventionen
**Styling**
- Nur SCSS, kein Tailwind. Komponentenspezifisch über `*.module.scss` (gescopte Klassen).
- Globale Styles nur in `styles/globals.scss`; Variablen in `styles/_variables.scss`.
- `@/`-Alias gilt nur für JS/TS-Imports. **In SCSS nicht** — dort relative Pfade,
  z. B. `@use "../styles/variables" as *;`

**i18n (next-intl)**
- `de` = Default (ohne URL-Prefix), `en` unter `/en`; Routing über `[locale]`-Segment.
- **Keine hardcodierten UI-Strings** — alle Texte über `messages/de.json` +
  `messages/en.json` (ICU-Format).

**Domänen-Daten**
- Beträge **immer als Integer in Cent** (1500 = 15,00 €), nie Floats.

**Secrets**
- Secrets in `.env.local` (nie committen). `.env.example` als Vorlage pflegen.

**Dependencies**
- Minimalistisch, wenig Code, keine unnötigen Pakete. Neue Dependencies vorher nennen.

**Tests (Vitest)**
- Test-Dateien `*.test.ts` **neben** der getesteten Datei ablegen (z. B.
  `lib/money.ts` → `lib/money.test.ts`). Vitest läuft im Node-Environment, Alias
  `@/*` wie in tsconfig.
- Reine Unit-Tests `*.test.ts` (keine I/O). Geld immer in Cent über die reinen
  Helfer in `lib/money.ts` (`toCents`/`fromCents`/`formatEur`).
- DB-Integrationstests `*.db.test.ts` laufen über `pnpm test:db` gegen eine
  separate Supabase-**Test-DB** (`TEST_DATABASE_URL` in `.env.local`). Fehlt die
  Variable oder ist sie = `DATABASE_URL`, werden sie übersprungen (nie gegen
  Dev/Prod). `globalSetup` migriert die Test-DB automatisch (Migrationen aus
  `drizzle/`); jeder Test legt eigene Daten an und räumt sie per ID wieder auf.

## Design
Minimalistischer, heller Look — durchgängig über die ganze Seite. Damit Features denselben
Look erben:
- **Tokens** aus `styles/_variables.scss` nutzen (Farben `$color-*`, Spacing-Skala
  `$space-1..6`, `$radius`, `$font-sans`) — keine rohen Hex-Werte / Magic-Numbers im Code.
- **Geteilte Primitive** als globale Klassen aus `styles/globals.scss` wiederverwenden:
  `.container`, `.btn` / `.btn--primary`, `.card`, `.input` (inkl. `:hover`/`:focus`).
  `globals.scss` schlank halten — nur Reset, Basis-Styles und diese Primitive.
- **Seiten-Hülle**: `[locale]/layout.tsx` rendert `<Header>` + `<main class="container">`.
  Jede Seite erbt diesen Rahmen und liefert nur Inhalt (kein eigenes `<header>`/`<main>`).
- **Komponenten-Styling** in `*.module.scss` (gescopt), das die Tokens via
  `@use "../styles/variables" as *;` referenziert (relativer Pfad, kein `@/`-Alias).
- Responsive/mobilfreundlich umsetzen.

## Domänen-Logik (kurz)
- **Anzeige-Modell**: Auktion (`startPrice` + `endsAt`) und Festpreis (`buyNowPrice`)
  sind je optional (alle in Cent, nullable) — mindestens eines ist gesetzt. Reine
  Festpreis-Anzeigen haben kein `endsAt`/`currentPrice`.
- **Bieten** server-seitig validieren (Server Action / Route Handler, nie nur Frontend):
  Auktion aktiv (`status==='active'` & `endsAt > jetzt`), Bieter ≠ Verkäufer,
  Gebot > `currentPrice`. `Bid` anlegen **und** `currentPrice`-Update in **einer
  DB-Transaktion**.
- **Sofort-Kauf** (`buyNow`, Server Action): Transaktion mit `SELECT … FOR UPDATE`,
  prüft aktiv + Käufer ≠ Verkäufer + `buyNowPrice` gesetzt; beendet die Anzeige sofort
  (`status='ended'` + `winnerId`) und legt eine pending Order an — **gleicher Zustand
  wie eine gewonnene Auktion**, daher Checkout/Webhook/Bezahl-Button unverändert. Der
  Lock serialisiert konkurrierende Käufe (nur der erste gewinnt).
- **Auktionsende**: Lazy Expiration (MVP) — beim Laden der Seite prüfen, ob abgelaufen,
  dann `status='ended'` + `winnerId` setzen. Cron-Job finalisiert nur Anzeigen mit
  `endsAt` (reine Festpreis-Anzeigen laufen nie ab). **Ausnahme** (kombinierte Anzeige
  ohne Gebote): Lief sie als Auktion *und* Festpreis und gehen keine Gebote ein, wird
  sie statt beendet zur reinen Festpreis-Anzeige degradiert (`endsAt`/`currentPrice` →
  `null`, `status` bleibt `active`) und bleibt kaufbar.
- **Status-Fluss**: `active → ended → paid`. Details siehe docs/KONZEPT.md.

## Nicht im Scope
Rating-System, tiefe Kategorien/Filter, Versand/Logistik, Käufer-Verkäufer-
Nachrichten, Echtzeit-WebSockets (Realtime nur als optionaler Bonus).

## Arbeitsweise
- Phasenweise arbeiten (Roadmap in docs/KONZEPT.md), **ein Commit pro Phase**.
- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:` …).
- Bei Unsicherheit zu Stil/Konvention: erst ansehen, wie es im Projekt gemacht wird.
