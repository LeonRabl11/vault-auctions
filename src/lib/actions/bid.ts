"use server";

import {revalidatePath} from "next/cache";
import {headers} from "next/headers";
import {eq} from "drizzle-orm";
import {auth} from "@/lib/auth";
import {db, user} from "@/lib/db";
import {toCents} from "@/lib/money";
import {placeBidTransaction} from "@/lib/bids";
import {bidInputSchema} from "@/lib/validation/bid";
import {sendOutbidEmail} from "@/lib/email";

export type PlaceBidResult = {ok: true} | {ok: false; error: string};

export async function placeBid(input: unknown): Promise<PlaceBidResult> {
  // 1. Nur eingeloggte Nutzer
  const session = await auth.api.getSession({headers: await headers()});
  if (!session) {
    return {ok: false, error: "unauthorized"};
  }

  // 2. Eingabe validieren
  const parsed = bidInputSchema.safeParse(input);
  if (!parsed.success) {
    return {ok: false, error: "invalid"};
  }

  const {auctionId, amountEur} = parsed.data;
  const amount = toCents(amountEur);
  const userId = session.user.id;

  try {
    // Row-Lock-Transaktion (FOR UPDATE) im wiederverwendbaren Kern.
    const result = await placeBidTransaction(db, {auctionId, userId, amount});

    if (result.ok) {
      // Detailseite neu rendern (neuer Preis + Historie)
      revalidatePath("/[locale]/marktplatz/[id]", "page");

      // Überboten-Mail NACH dem Commit, außerhalb der Transaktion, tolerant.
      // Nur wenn es einen vorherigen, anderen Höchstbieter gab.
      if (result.previousBidderId && result.previousBidderId !== userId) {
        try {
          const [prev] = await db
            .select({email: user.email, name: user.name})
            .from(user)
            .where(eq(user.id, result.previousBidderId))
            .limit(1);
          if (prev) {
            await sendOutbidEmail({
              to: prev.email,
              name: prev.name,
              auctionTitle: result.auctionTitle,
              newPrice: amount,
              auctionId,
            });
          }
        } catch (e) {
          console.error("[email] outbid notification failed", e);
        }
      }

      return {ok: true} as const;
    }
    return result;
  } catch {
    return {ok: false, error: "generic"};
  }
}
