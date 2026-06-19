"use server";

import {headers} from "next/headers";
import {eq} from "drizzle-orm";
import {z} from "zod";
import {auth} from "@/lib/auth";
import {auctions, db, orders} from "@/lib/db";
import {startCheckout, type CheckoutResult} from "@/lib/actions/checkout";
import {routing} from "@/i18n/routing";

// Zahlungsfrist nach dem Kauf — identisch zur gewonnenen Auktion (siehe lib/auctions.ts)
const PAYMENT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 Stunden

const inputSchema = z.object({
  auctionId: z.string().uuid(),
  locale: z.enum(routing.locales),
});

/**
 * Sofort-Kauf (Festpreis). Beendet die Anzeige sofort und erzeugt denselben
 * Zustand wie eine gewonnene Auktion (status='ended', winnerId = Käufer, pending
 * Order über buyNowPrice) — dadurch bleiben Checkout, Webhook und Bezahl-Button
 * unverändert nutzbar.
 *
 * Nebenläufigkeit: Der Row-Lock (SELECT … FOR UPDATE) serialisiert konkurrierende
 * Käufe — nur der erste gewinnt, alle weiteren sehen status != 'active' und
 * bekommen "notAvailable". Bricht der Käufer den Checkout ab, bleibt die Order
 * pending und ist später übers Dashboard bezahlbar (wie eine unbezahlte Auktion).
 */
export async function buyNow(input: unknown): Promise<CheckoutResult> {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session) {
    return {ok: false, error: "unauthorized"};
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {ok: false, error: "invalid"};
  }
  const {auctionId, locale} = parsed.data;
  const userId = session.user.id;

  let orderId: string;
  try {
    const result = await db.transaction(async (tx) => {
      const [auction] = await tx
        .select({
          status: auctions.status,
          sellerId: auctions.sellerId,
          buyNowPrice: auctions.buyNowPrice,
        })
        .from(auctions)
        .where(eq(auctions.id, auctionId))
        .for("update")
        .limit(1);

      if (!auction) {
        return {ok: false, error: "notFound"} as const;
      }
      // Anzeige ohne Festpreis lässt sich nicht sofort kaufen
      if (auction.buyNowPrice == null) {
        return {ok: false, error: "notAvailable"} as const;
      }
      // Käufer darf nicht der Verkäufer sein
      if (auction.sellerId === userId) {
        return {ok: false, error: "ownAuction"} as const;
      }
      // Nur solange aktiv (innerhalb des Locks geprüft -> nur der Erste gewinnt)
      if (auction.status !== "active") {
        return {ok: false, error: "notAvailable"} as const;
      }

      // Sofort beenden + Käufer als Gewinner setzen
      await tx
        .update(auctions)
        .set({status: "ended", winnerId: userId})
        .where(eq(auctions.id, auctionId));

      // pending Order (Betrag = Festpreis), 48h Zahlungsfrist
      const [created] = await tx
        .insert(orders)
        .values({
          auctionId,
          buyerId: userId,
          amount: auction.buyNowPrice,
          status: "pending",
          paymentDueAt: new Date(Date.now() + PAYMENT_WINDOW_MS),
        })
        .returning({id: orders.id});

      return {ok: true, orderId: created.id} as const;
    });

    if (!result.ok) {
      return result;
    }
    orderId = result.orderId;
  } catch {
    return {ok: false, error: "generic"};
  }

  // Bestehende Stripe-Checkout-Erstellung wiederverwenden und URL zurückgeben
  return startCheckout({orderId, locale});
}
