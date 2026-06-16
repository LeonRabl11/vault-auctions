import {NextResponse} from "next/server";
import {and, eq} from "drizzle-orm";
import type Stripe from "stripe";
import {stripe} from "@/lib/stripe";
import {db, orders} from "@/lib/db";

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
      // Idempotent: nur eine noch offene Order wird auf 'paid' gesetzt
      await db
        .update(orders)
        .set({status: "paid"})
        .where(and(eq(orders.id, orderId), eq(orders.status, "pending")));
    }
  }

  return NextResponse.json({received: true});
}
