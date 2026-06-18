# Vault

An online auction platform where users list items, place bids, and the highest bidder wins and pays at auction close.

**Live demo:** https://vault-auctions-app.vercel.app

> Try it: register with any email and password (no email verification needed to log in). To test a purchase, use Stripe's test card `4242 4242 4242 4242` with any future expiry date and any CVC.

## Screenshots

<!-- Add 2–3 screenshots here for the biggest impact, e.g. the homepage, an auction detail page, and the dashboard. -->
<!-- ![Homepage](docs/home.png) -->

## Features

- **Create auctions** with image upload, starting price, and a configurable runtime
- **Bidding** with a live countdown to the auction's end
- **Concurrency-safe bids** via database row-level locking, so simultaneous bids can't corrupt the price
- **Automatic auction close** through a scheduled job that finalizes expired auctions and determines the winner
- **Pay-after-win** with Stripe Checkout; payment is confirmed server-side via webhook
- **Email notifications** for being outbid, winning an auction, and payment received, plus email verification on sign-up
- **User dashboard** showing your auctions, your bids, and won items (with a pay button for unpaid wins)
- **Internationalization** (German / English) via `next-intl`

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript |
| Styling | SCSS Modules |
| Internationalization | next-intl |
| Authentication | Better Auth (email / password) |
| Database | PostgreSQL (Supabase) + Drizzle ORM |
| File storage | AWS S3 (presigned-URL uploads) |
| Payments | Stripe (Checkout + webhooks) |
| Transactional email | Brevo |
| Scheduled jobs | AWS Lambda + EventBridge Scheduler |
| Hosting | Vercel |

## Architecture highlights

- **Race-safe bidding** — bids are placed inside a transaction using `SELECT … FOR UPDATE`, so concurrent bids on the same auction are serialized and can't overwrite each other.
- **Scheduled auction finalization** — an EventBridge schedule invokes a Lambda every minute, which calls a secret-protected endpoint that ends expired auctions, sets the winner, and creates a pending order. Auctions close on time regardless of whether anyone is viewing them.
- **Webhook as source of truth** — order payment status is updated from Stripe's signature-verified, idempotent `checkout.session.completed` webhook, not the browser redirect, so a payment is never missed if the buyer closes the tab.
- **Money as integer cents** — all amounts are stored and computed in cents to avoid floating-point errors.

## Getting started

### Prerequisites

- Node.js and [pnpm](https://pnpm.io/)
- A PostgreSQL database (e.g. Supabase) and accounts for AWS S3, Stripe, and Brevo

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Create your environment file and fill in the values
cp .env.example .env.local

# 3. Apply database migrations
pnpm db:migrate

# 4. Start the dev server
pnpm dev
```

Open http://localhost:3000 to view the app.

### Environment variables

See `.env.example` for the exact list. You will need, broadly:

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`
- AWS S3 credentials and bucket (access key, secret, region, bucket name)
- Stripe secret key, publishable key, and `STRIPE_WEBHOOK_SECRET`
- Brevo API key and sender email / name
- `CRON_SECRET` — protects the auction-finalization endpoint

## Deployment

The app is hosted on **Vercel**. Auction finalization runs as an **AWS Lambda** invoked every minute by **EventBridge Scheduler**, which calls the protected `/api/cron/finalize` endpoint with a bearer secret.

---

Built as a portfolio project.
