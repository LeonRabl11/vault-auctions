
# Auktionsplattform – Konzept & Roadmap

Ein fokussiertes Portfolio-Projekt: eine eBay-inspirierte Auktionsplattform, die den kompletten Fullstack vereint und durch ein sauberes Bietsystem beeindruckt.

> Diese Datei ist die Langfassung (Spec & Plan). Die Arbeitskonventionen für Claude Code stehen in der `CLAUDE.md` im Projekt-Root.

## 1. Das Konzept

Nutzer stellen Artikel zur Versteigerung ein, andere geben Gebote ab, der Höchstbietende gewinnt bei Ablauf der Auktion und bezahlt. Das Thema ist flexibel (Sammlerstücke, Vintage-Mode, Technik, Kunst) – die Mechanik bleibt gleich.

**Was es eBay-ähnlich macht:** Auktionen mit Geboten, Countdown, Höchstgebot-Logik, Gewinner-Ermittlung.

**Was bewusst WEGGELASSEN wird** (sonst wird es ein Monatsprojekt):

- ❌ Sofort-Kauf-Option
- ❌ Bewertungs-/Rating-System
- ❌ Tiefe Kategorien & Filter (eine flache Liste reicht)
- ❌ Versand-/Logistikabwicklung
- ❌ Nachrichten zwischen Käufer und Verkäufer
- ❌ Echtzeit-Updates per WebSocket (kommt als optionaler Bonus)

Diese Abgrenzung ist selbst ein Qualitätsmerkmal: bewusste Scope-Steuerung statt Verzetteln.

## 2. Tech-Stack

| Bereich | Technologie |
|---|---|
| Framework | Next.js 16.2.9 (App Router, Turbopack) |
| Sprache | TypeScript |
| i18n | next-intl (`de` = Default, `en`) |
| Datenbank | PostgreSQL (via Supabase, nur als DB) |
| ORM | Drizzle ORM |
| Auth | NextAuth / Auth.js |
| Bildspeicher | AWS S3 |
| Zahlung | Stripe (Test-Modus) |
| E-Mail | Brevo |
| Styling | **SCSS** (Next.js built-in Sass) – kein Tailwind |
| Validierung | Zod |
| Hosting | Vercel |

## 3. Feature-Scope

### MVP (das Herzstück – zuerst bauen)

- [ ] Auth: Registrierung, Login, Logout
- [ ] Auktion erstellen: Titel, Beschreibung, Bild (S3), Startpreis, Enddatum
- [ ] Auktions-Übersicht: alle laufenden Auktionen als Liste/Grid
- [ ] Auktions-Detailseite: Bild, Infos, aktuelles Höchstgebot, Countdown-Timer
- [ ] Bieten: Gebot abgeben (muss höher sein als aktuelles Gebot)
- [ ] Auktions-Ende: bei Ablauf gewinnt der Höchstbietende
- [ ] Zahlung: Gewinner bezahlt per Stripe
- [ ] E-Mails: „überboten", „gewonnen", „Zahlung bestätigt" (Brevo)
- [ ] Dashboard: eigene Auktionen + eigene Gebote + gewonnene Artikel

### Bonus (nur wenn Zeit)

- [ ] Echtzeit-Gebote per Supabase Realtime
- [ ] Mindest-Inkrement (z. B. immer mind. 1 € mehr)
- [ ] Automatische Auktions-Beendigung per Vercel Cron Job
- [ ] Suche / einfache Filter
- [ ] Ein paar Tests (Vitest)

## 4. Datenmodell

```
User
├── id (uuid)
├── email
├── name
├── passwordHash
└── createdAt

Auction
├── id (uuid)
├── sellerId      → User.id
├── title
├── description
├── imageUrl       (S3-Link)
├── startPrice     (in Cent)
├── currentPrice   (aktuelles Höchstgebot, in Cent)
├── endsAt         (Zeitpunkt des Auktionsendes)
├── status         (active | ended | paid)
├── winnerId       → User.id  (nullable, gesetzt bei Ablauf)
└── createdAt

Bid
├── id (uuid)
├── auctionId      → Auction.id
├── bidderId       → User.id
├── amount         (in Cent)
└── createdAt

Order
├── id (uuid)
├── auctionId      → Auction.id
├── buyerId        → User.id  (= winnerId)
├── stripeSessionId
├── status         (pending | paid)
└── createdAt
```

**Wichtig:** Beträge immer in Cent als Ganzzahl speichern (z. B. `1500` statt `15.00`) – das vermeidet Rundungsfehler und ist genau das, was Stripe erwartet.

## 5. Die Auktions-Logik (das Herzstück)

**a) Gebot abgeben** – server-seitig prüfen:

- Auktion noch aktiv? (`status === 'active'` und `endsAt > jetzt`)
- Bieter ≠ Verkäufer?
- Gebot höher als `currentPrice`?

Wenn alles passt: neues `Bid` anlegen **und** `currentPrice` aktualisieren – idealerweise in einer DB-Transaktion, damit beides zusammen passiert. Diese Prüfung gehört auf den Server (API-Route / Server Action), niemals nur ins Frontend. Frontend-Validierung ist Komfort, Server-Validierung ist Sicherheit.

**b) Auktion beenden**

- *MVP – Lazy Expiration:* Immer wenn jemand die Auktions-Seite lädt, prüfen: `endsAt` vorbei und `status` noch `active`? Wenn ja → `status = 'ended'`, `winnerId` = Bieter des höchsten Gebots, E-Mails versenden.
- *Bonus – Cron:* Ein Vercel Cron Job läuft z. B. stündlich, findet alle abgelaufenen aktiven Auktionen und beendet sie zentral. Erst nach dem MVP.

**c) Zahlung des Gewinners**

Nach Auktionsende sieht der Gewinner im Dashboard „Gewonnen – jetzt bezahlen" → Stripe Checkout über `currentPrice`. Nach erfolgreicher Zahlung (Stripe-Webhook): `status = 'paid'`, `Order` anlegen, Bestätigungsmail (Brevo).

**d) Der Countdown (Frontend)**

Der tickende Countdown-Timer auf der Detailseite ist reines Frontend (JS-Intervall, das `endsAt` herunterzählt). Technisch simpel, aber visuell der Hingucker in der Demo.

## 6. Phasen-Roadmap (~3 Wochen neben dem Job)

Jede Phase ist ein abgeschlossener, committbarer Block.

- **Phase 0 – Setup (Tag 1):** Next.js + TypeScript + SCSS-Grundgerüst, GitHub-Repo, Supabase + Drizzle, erste Migration, i18n-Grundgerüst (next-intl, de/en). → `chore: project setup`
- **Phase 1 – Authentifizierung (Tag 2–3):** NextAuth mit E-Mail/Passwort, Registrierung, Login, geschützte Routen. → `feat: user authentication`
- **Phase 2 – Auktionen erstellen (Tag 4–6):** S3-Upload einrichten, Formular zum Anlegen einer Auktion (Bild, Startpreis, Enddatum). → `feat: auction creation with image upload`
- **Phase 3 – Übersicht & Detailseite (Tag 7–9):** Liste aller aktiven Auktionen, Detailseite mit Bild, Infos und Countdown-Timer. → `feat: auction listing and detail views with countdown`
- **Phase 4 – Bietsystem (Tag 10–13) ⭐ Herzstück:** Gebot abgeben mit server-seitiger Validierung, `currentPrice` aktualisieren, Gebotshistorie anzeigen. → `feat: bidding system with server-side validation`
- **Phase 5 – Auktions-Ende & Gewinner (Tag 14–15):** Lazy Expiration, Gewinner-Ermittlung bei Ablauf, Status-Handling. → `feat: auction expiration and winner determination`
- **Phase 6 – Zahlung (Tag 16–18):** Stripe-Checkout für den Gewinner, Webhook für Zahlungsbestätigung, Order anlegen. → `feat: Stripe payment for auction winner`
- **Phase 7 – E-Mails (Tag 19–20):** Brevo-Integration: „überboten", „gewonnen", „Zahlung bestätigt". → `feat: email notifications via Brevo`
- **Phase 8 – Dashboard, Polish & Launch (Tag 21–24):** Dashboard (eigene Auktionen, Gebote, gewonnene Artikel), Fehlerbehandlung, Loading-States, README, Deploy auf Vercel. → `feat: user dashboard` / `docs: README` / `chore: deploy`

## 7. Warum dieses Projekt bei der Bewerbung trägt

- **Vollständiger Stack** – Auth, Bild-Upload, echtes Payment, E-Mail, i18n, alles drin.
- **Echte Logik statt CRUD** – das Bietsystem und die Auktions-Beendigung zeigen Problemlösung.
- **Sichtbarer Wow-Faktor** – Countdown + steigende Gebote in der Live-Demo.
- **Trade-off-Geschichten fürs Gespräch** – Lazy Expiration vs. Cron, Server- vs. Frontend-Validierung, Beträge in Cent.
- **Sauber abgegrenzter Scope** – zeigt, dass du fokussiert lieferst.

Wenn der MVP steht, live läuft und eine ordentliche README mit Screenshot hat, hebt dich das klar von der Masse ab.