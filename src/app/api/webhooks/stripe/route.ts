import {NextResponse} from "next/server";
import {and, eq} from "drizzle-orm";
import type Stripe from "stripe";
import {stripe} from "@/lib/stripe";
import {auctions, db, orders, user} from "@/lib/db";
import {sendPaidEmail} from "@/lib/email";
import {processCheckoutCompleted} from "@/lib/webhooks/stripe-checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({error: "bad request"}, {status: 400});
  }

  // Roher Body ist für die Signaturprüfung zwingend
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({error: "invalid signature"}, {status: 400});
  }

  if (event.type === "checkout.session.completed") {
    const checkout = event.data.object as Stripe.Checkout.Session;

    // Reale DB-/Mail-Abhängigkeiten injizieren; die idempotente Orchestrierung
    // liegt in processCheckoutCompleted (separat unit-getestet).
    await processCheckoutCompleted(checkout, {
      // Idempotent: nur eine noch offene Order wird auf 'paid' gesetzt.
      // returning() ist leer, wenn der Wechsel schon erfolgt war (doppeltes Event).
      markOrderPaidIfPending: async (orderId) => {
        const [paidOrder] = await db
          .update(orders)
          .set({status: "paid"})
          .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
          .returning({
            buyerId: orders.buyerId,
            auctionId: orders.auctionId,
            amount: orders.amount,
          });
        return paidOrder ?? null;
      },
      loadBuyerInfo: async (order) => {
        const [info] = await db
          .select({
            email: user.email,
            name: user.name,
            title: auctions.title,
          })
          .from(user)
          .innerJoin(auctions, eq(auctions.id, order.auctionId))
          .where(eq(user.id, order.buyerId))
          .limit(1);
        return info ?? null;
      },
      sendPaidEmail,
    });
  }

  return NextResponse.json({received: true});
}
