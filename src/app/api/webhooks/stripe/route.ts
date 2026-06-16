import {NextResponse} from "next/server";
import {and, eq} from "drizzle-orm";
import type Stripe from "stripe";
import {stripe} from "@/lib/stripe";
import {auctions, db, orders, user} from "@/lib/db";
import {sendPaidEmail} from "@/lib/email";

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
    const orderId = checkout.metadata?.orderId;

    if (orderId) {
      // Idempotent: nur eine noch offene Order wird auf 'paid' gesetzt.
      // returning() verrät, ob WIRKLICH pending->paid gewechselt wurde — bei
      // doppelten Events ist das Array leer, also keine zweite Mail.
      const [paidOrder] = await db
        .update(orders)
        .set({status: "paid"})
        .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
        .returning({
          buyerId: orders.buyerId,
          auctionId: orders.auctionId,
          amount: orders.amount,
        });

      // Bestätigungsmail NACH dem Commit, tolerant — Fehler darf den Webhook
      // (sonst retryt Stripe) nicht in einen 500 kippen.
      if (paidOrder) {
        try {
          const [info] = await db
            .select({
              email: user.email,
              name: user.name,
              title: auctions.title,
            })
            .from(user)
            .innerJoin(auctions, eq(auctions.id, paidOrder.auctionId))
            .where(eq(user.id, paidOrder.buyerId))
            .limit(1);
          if (info) {
            await sendPaidEmail({
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
    }
  }

  return NextResponse.json({received: true});
}
