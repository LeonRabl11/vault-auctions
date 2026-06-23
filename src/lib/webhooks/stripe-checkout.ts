import type Stripe from "stripe";

// Order-Daten, die nach dem Bezahlen für die Bestätigungsmail gebraucht werden.
export type PaidOrder = {
  buyerId: string;
  auctionId: string;
  amount: number; // in Cent
};

export type BuyerInfo = {
  email: string;
  name: string;
  title: string;
};

// Injizierbare Abhängigkeiten — entkoppeln die Logik von Drizzle/Brevo, damit
// sie ohne HTTP-Request, echte DB und echtes Stripe-/Mail-SDK testbar ist.
export type CheckoutCompletedDeps = {
  // Setzt die Order atomar pending -> paid und gibt sie NUR zurück, wenn DIESER
  // Aufruf den Wechsel tatsächlich vollzogen hat (sonst null). Genau hier sitzt
  // die Idempotenz: bei doppelter Event-Zustellung ist die Order bereits paid,
  // also liefert der zweite Aufruf null und es passiert nichts weiter.
  markOrderPaidIfPending: (orderId: string) => Promise<PaidOrder | null>;
  loadBuyerInfo: (order: PaidOrder) => Promise<BuyerInfo | null>;
  sendPaidEmail: (args: {
    to: string;
    name: string;
    auctionTitle: string;
    amount: number;
    auctionId: string;
  }) => Promise<void>;
};

/**
 * Verarbeitet ein `checkout.session.completed`-Event.
 *
 * Idempotent durch `markOrderPaidIfPending`: nur der erste (echte) Wechsel
 * pending -> paid löst die Bestätigungsmail aus. Mail-Fehler werden geschluckt,
 * damit der Webhook nicht in einen 500 kippt (Stripe würde sonst erneut zustellen).
 */
export async function processCheckoutCompleted(
  session: Stripe.Checkout.Session,
  deps: CheckoutCompletedDeps,
): Promise<void> {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const paidOrder = await deps.markOrderPaidIfPending(orderId);
  if (!paidOrder) return; // unbekannt oder bereits paid -> No-Op

  try {
    const info = await deps.loadBuyerInfo(paidOrder);
    if (info) {
      await deps.sendPaidEmail({
        to: info.email,
        name: info.name,
        auctionTitle: info.title,
        amount: paidOrder.amount,
        auctionId: paidOrder.auctionId,
      });
    }
  } catch (e) {
    console.error("[email] paid notification failed", e);
  }
}
