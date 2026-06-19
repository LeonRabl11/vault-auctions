"use server";

import {revalidatePath} from "next/cache";
import {headers} from "next/headers";
import {asc, desc, eq} from "drizzle-orm";
import {auth} from "@/lib/auth";
import {auctions, bids, db, user} from "@/lib/db";
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
      // Auktion muss aktiv und nicht abgelaufen sein. endsAt == null bedeutet
      // reine Festpreis-Anzeige (keine Auktion) -> kein Bieten möglich.
      if (
        auction.status !== "active" ||
        auction.endsAt == null ||
        auction.endsAt.getTime() <= Date.now()
      ) {
        return {ok: false, error: "auctionEnded"} as const;
      }
      // Gebot muss das aktuelle Höchstgebot übersteigen (innerhalb des Locks
      // geprüft -> kein Gebot kann durch ein gleichzeitiges verloren gehen).
      // currentPrice ist bei Auktionen gesetzt; ?? 0 nur fürs Typing.
      if (amount <= (auction.currentPrice ?? 0)) {
        return {ok: false, error: "tooLow"} as const;
      }

      // Bisherigen Höchstbieter merken (vor dem Insert) — für die Überboten-Mail
      const [prevTop] = await tx
        .select({bidderId: bids.bidderId})
        .from(bids)
        .where(eq(bids.auctionId, auctionId))
        .orderBy(desc(bids.amount), asc(bids.createdAt))
        .limit(1);

      // Bid anlegen UND currentPrice aktualisieren — in einer Transaktion
      await tx.insert(bids).values({auctionId, bidderId: userId, amount});
      await tx
        .update(auctions)
        .set({currentPrice: amount})
        .where(eq(auctions.id, auctionId));

      return {
        ok: true,
        previousBidderId: prevTop?.bidderId ?? null,
        auctionTitle: auction.title,
      } as const;
    });

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
