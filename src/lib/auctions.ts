import "server-only";
import {asc, desc, eq} from "drizzle-orm";
import {auctions, bids, db} from "@/lib/db";

/**
 * Lazy Expiration: Schließt eine abgelaufene, noch aktive Auktion ab.
 *
 * Atomar über eine Transaktion mit Row-Lock (SELECT … FOR UPDATE) + Re-Check:
 * Bei gleichzeitigen Aufrufen finalisiert nur der erste, alle weiteren sehen
 * dann bereits status='ended' und tun nichts.
 *
 * Gewinner = Bieter des höchsten Gebots (Gleichstand kann nicht auftreten, da
 * jedes Gebot das vorige übersteigen muss). Ohne Gebote bleibt winnerId null.
 *
 * Gibt true zurück, wenn diese Aufruf die Auktion abgeschlossen hat, sonst false
 * (z. B. bereits beendet oder noch nicht abgelaufen).
 */
export async function finalizeAuction(id: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [auction] = await tx
      .select({status: auctions.status, endsAt: auctions.endsAt})
      .from(auctions)
      .where(eq(auctions.id, id))
      .for("update")
      .limit(1);

    if (!auction || auction.status !== "active") return false;
    if (auction.endsAt.getTime() >= Date.now()) return false;

    const [top] = await tx
      .select({bidderId: bids.bidderId})
      .from(bids)
      .where(eq(bids.auctionId, id))
      .orderBy(desc(bids.amount), asc(bids.createdAt))
      .limit(1);

    await tx
      .update(auctions)
      .set({status: "ended", winnerId: top?.bidderId ?? null})
      .where(eq(auctions.id, id));

    return true;
  });
}
