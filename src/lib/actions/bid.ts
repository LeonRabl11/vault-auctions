"use server";

import {revalidatePath} from "next/cache";
import {headers} from "next/headers";
import {eq} from "drizzle-orm";
import {auth} from "@/lib/auth";
import {auctions, bids, db} from "@/lib/db";
import {bidInputSchema} from "@/lib/validation/bid";

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
  const amount = Math.round(amountEur * 100); // € -> Cent
  const userId = session.user.id;

  try {
    const result = await db.transaction(async (tx) => {
      // Row-Lock: serialisiert konkurrierende Gebote auf dieselbe Auktion
      const [auction] = await tx
        .select()
        .from(auctions)
        .where(eq(auctions.id, auctionId))
        .for("update")
        .limit(1);

      if (!auction) {
        return {ok: false, error: "notFound"} as const;
      }
      // Bieter darf nicht der Verkäufer sein
      if (auction.sellerId === userId) {
        return {ok: false, error: "ownAuction"} as const;
      }
      // Auktion muss aktiv und nicht abgelaufen sein
      if (
        auction.status !== "active" ||
        auction.endsAt.getTime() <= Date.now()
      ) {
        return {ok: false, error: "auctionEnded"} as const;
      }
      // Gebot muss das aktuelle Höchstgebot übersteigen (innerhalb des Locks
      // geprüft -> kein Gebot kann durch ein gleichzeitiges verloren gehen)
      if (amount <= auction.currentPrice) {
        return {ok: false, error: "tooLow"} as const;
      }

      // Bid anlegen UND currentPrice aktualisieren — in einer Transaktion
      await tx.insert(bids).values({auctionId, bidderId: userId, amount});
      await tx
        .update(auctions)
        .set({currentPrice: amount})
        .where(eq(auctions.id, auctionId));

      return {ok: true} as const;
    });

    if (result.ok) {
      // Detailseite neu rendern (neuer Preis + Historie)
      revalidatePath("/[locale]/auctions/[id]", "page");
    }
    return result;
  } catch {
    return {ok: false, error: "generic"};
  }
}
