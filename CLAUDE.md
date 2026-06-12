# CLAUDE.md — Auktionsplattform

## Projekt
eBay-inspirierte Auktionsplattform (Portfolio-Projekt): Artikel einstellen, bieten,
Höchstbietender gewinnt bei Ablauf und bezahlt. Vollständige Spec, Datenmodell und
Phasen-Roadmap: **docs/KONZEPT.md** (Langfassung — nicht hierher kopieren).

## Tech-Stack
- **Next.js 16.2.9** (App Router, Turbopack) + **React 19.2.4**
- **TypeScript** (strict), Pfad-Alias `@/*` → `./src/*`
- **Styling: SCSS** (Next.js built-in Sass, `sass ^1.100.0`) — **kein Tailwind**
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
- `app/api/auth/[...all]/` — Better-Auth-Route-Handler
- `app/[locale]/{login,register,dashboard}/` — Auth-Seiten (dashboard ist geschützt)
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
- **Bieten** server-seitig validieren (Server Action / Route Handler, nie nur Frontend):
  Auktion aktiv (`status==='active'` & `endsAt > jetzt`), Bieter ≠ Verkäufer,
  Gebot > `currentPrice`. `Bid` anlegen **und** `currentPrice`-Update in **einer
  DB-Transaktion**.
- **Auktionsende**: Lazy Expiration (MVP) — beim Laden der Seite prüfen, ob abgelaufen,
  dann `status='ended'` + `winnerId` setzen. Cron-Job optional/später.
- **Status-Fluss**: `active → ended → paid`. Details siehe docs/KONZEPT.md.

## Nicht im Scope
Sofort-Kauf, Rating-System, tiefe Kategorien/Filter, Versand/Logistik, Käufer-Verkäufer-
Nachrichten, Echtzeit-WebSockets (Realtime nur als optionaler Bonus).

## Arbeitsweise
- Phasenweise arbeiten (Roadmap in docs/KONZEPT.md), **ein Commit pro Phase**.
- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:` …).
- Bei Unsicherheit zu Stil/Konvention: erst ansehen, wie es im Projekt gemacht wird.
