import {asc, desc, eq} from "drizzle-orm";
import type {PostgresJsDatabase} from "drizzle-orm/postgres-js";
// Bewusst aus dem Schema-Modul (nicht @/lib/db), damit dieser Kern keinen
// DB-Client erzwingt — er bekommt die Verbindung als Parameter.
import * as schema from "@/lib/db/schema";
import {auctions, bids} from "@/lib/db/schema";

type Database = PostgresJsDatabase<typeof schema>;

export type PlaceBidTxResult =
  | {ok: true; previousBidderId: string | null; auctionTitle: string}
  | {ok: false; error: string};

/**
 * Kern der Gebotsabgabe in EINER Transaktion mit Row-Lock (SELECT … FOR UPDATE):
 * Der Lock serialisiert konkurrierende Gebote auf dieselbe Auktion, sodass die
 * "> currentPrice"-Prüfung und das Update atomar sind — kein gleichzeitiges
 * Gebot kann verloren gehen oder einen inkonsistenten Stand erzeugen.
 *
 * Nimmt die Drizzle-Verbindung als Parameter entgegen (App-DB im Betrieb,
 * Test-DB im Test) — getestet wird damit genau diese Transaktion, keine
 * Nachbildung. Auth/Validierung/Mail/Revalidate liegen im Aufrufer (actions/bid).
 */
export async function placeBidTransaction(
  database: Database,
  params: {auctionId: string; userId: string; amount: number},
): Promise<PlaceBidTxResult> {
  const {auctionId, userId, amount} = params;

  return database.transaction(async (tx) => {
    const [auction] = await tx
      .select()
      .from(auctions)
      .where(eq(auctions.id, auctionId))
      .for("update")
      .limit(1);

    if (!auction) {
      return {ok: false, error: "notFound"};
    }
    if (auction.sellerId === userId) {
      return {ok: false, error: "ownAuction"};
    }
    if (
      auction.status !== "active" ||
      auction.endsAt == null ||
      auction.endsAt.getTime() <= Date.now()
    ) {
      return {ok: false, error: "auctionEnded"};
    }
    if (amount <= (auction.currentPrice ?? 0)) {
      return {ok: false, error: "tooLow"};
    }

    // Bisherigen Höchstbieter merken (für die Überboten-Mail des Aufrufers).
    const [prevTop] = await tx
      .select({bidderId: bids.bidderId})
      .from(bids)
      .where(eq(bids.auctionId, auctionId))
      .orderBy(desc(bids.amount), asc(bids.createdAt))
      .limit(1);

    // Bid anlegen UND currentPrice aktualisieren — atomar im Lock.
    await tx.insert(bids).values({auctionId, bidderId: userId, amount});
    await tx
      .update(auctions)
      .set({currentPrice: amount})
      .where(eq(auctions.id, auctionId));

    return {
      ok: true,
      previousBidderId: prevTop?.bidderId ?? null,
      auctionTitle: auction.title,
    };
  });
}
