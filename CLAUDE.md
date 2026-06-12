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
- Geplant (lt. Konzept, noch nicht installiert): next-intl, Drizzle ORM + PostgreSQL
  (Supabase), NextAuth, Zod, Stripe, AWS S3, Brevo

## Befehle
- `pnpm dev` — Dev-Server (Turbopack)
- `pnpm build` — Production-Build
- `pnpm start` — Production-Server
- `pnpm lint` — ESLint
- *(DB, sobald Drizzle eingerichtet: `drizzle-kit generate` / `migrate` — noch nicht vorhanden)*

## Struktur (src/)
- `app/` — App Router (Routen, Layouts, Pages). Globale Texte/Styles via Root-Layout.
- `components/` — wiederverwendbare React-Komponenten
- `lib/` — Utilities / Server-Logik (Validierung, DB-Zugriff, Helpers)
- `styles/` — `_variables.scss` (Partial), `globals.scss` (global)
- Geplant: `app/[locale]/` (i18n-Routing) + `messages/de.json` / `messages/en.json`

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
