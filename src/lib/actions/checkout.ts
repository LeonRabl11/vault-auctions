"use server";

import {headers} from "next/headers";
import {and, eq} from "drizzle-orm";
import {z} from "zod";
import {auth} from "@/lib/auth";
import {auctions, db, orders} from "@/lib/db";
import {stripe} from "@/lib/stripe";
import {routing} from "@/i18n/routing";

export type CheckoutResult =
  | {ok: true; url: string}
  | {ok: false; error: string};

const inputSchema = z.object({
  orderId: z.string().uuid(),
  locale: z.enum(routing.locales),
});

function baseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

export async function startCheckout(input: unknown): Promise<CheckoutResult> {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session) {
    return {ok: false, error: "unauthorized"};
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {ok: false, error: "invalid"};
  }
  const {orderId, locale} = parsed.data;

  // Order + Auktionstitel laden; nur der Käufer einer offenen Order darf zahlen
  const [order] = await db
    .select({
      id: orders.id,
      amount: orders.amount,
      status: orders.status,
      buyerId: orders.buyerId,
      auctionId: orders.auctionId,
      title: auctions.title,
    })
    .from(orders)
    .innerJoin(auctions, eq(orders.auctionId, auctions.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order || order.buyerId !== session.user.id) {
    return {ok: false, error: "notFound"};
  }
  if (order.status !== "pending") {
    return {ok: false, error: "notPayable"};
  }

  // Detailseite mit Locale-Prefix (de = Default ohne Prefix)
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const detailUrl = `${baseUrl()}${prefix}/auctions/${order.auctionId}`;

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: order.amount, // Cent
            product_data: {name: order.title},
          },
        },
      ],
      metadata: {orderId: order.id},
      success_url: `${detailUrl}?paid=1`,
      cancel_url: detailUrl,
    });

    if (!checkout.url) {
      return {ok: false, error: "generic"};
    }

    // Session-ID an der Order vermerken (Nachvollziehbarkeit)
    await db
      .update(orders)
      .set({stripeSessionId: checkout.id})
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending")));

    return {ok: true, url: checkout.url};
  } catch {
    return {ok: false, error: "generic"};
  }
}
