import "server-only";
import {asc, desc, eq} from "drizzle-orm";
import {auctions, bids, db, orders, user} from "@/lib/db";
import {sendWonEmail} from "@/lib/email";

// Zahlungsfrist des Gewinners nach Auktionsende
const PAYMENT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 Stunden

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
      .select({
        status: auctions.status,
        endsAt: auctions.endsAt,
        currentPrice: auctions.currentPrice,
      })
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

    const winnerId = top?.bidderId ?? null;

    await tx
      .update(auctions)
      .set({status: "ended", winnerId})
      .where(eq(auctions.id, id));

    // Bei Gewinner: Order anlegen (Schlusspreis, 48h Zahlungsfrist).
    // onConflictDoNothing schützt gegen Doppelanlage (unique auctionId).
    if (winnerId) {
      await tx
        .insert(orders)
        .values({
          auctionId: id,
          buyerId: winnerId,
          amount: auction.currentPrice,
          status: "pending",
          paymentDueAt: new Date(Date.now() + PAYMENT_WINDOW_MS),
        })
        .onConflictDoNothing();
    }

    return true;
  });
}

/**
 * finalizeAuction + Gewinner-Benachrichtigung an EINER zentralen Stelle.
 *
 * Cron-Job und Lazy Expiration nutzen ausschließlich diesen Wrapper, damit die
 * "Gewonnen"-Mail genau einmal rausgeht: finalizeAuction liefert nur beim
 * tatsächlichen Abschluss true (atomar, Row-Lock) — alle Folgeaufrufe sehen
 * status='ended' und kehren mit false zurück, ohne erneut zu mailen.
 *
 * Der Mailversand läuft NACH dem Commit, außerhalb der Transaktion, in try/catch
 * — ein Fehler bricht die Finalisierung nicht ab.
 */
export async function finalizeAuctionAndNotify(id: string): Promise<boolean> {
  const finalized = await finalizeAuction(id);
  if (!finalized) return false;

  try {
    // Gewinner laden (innerJoin -> ohne winnerId/Gebote kein Treffer, keine Mail)
    const [row] = await db
      .select({title: auctions.title, email: user.email, name: user.name})
      .from(auctions)
      .innerJoin(user, eq(auctions.winnerId, user.id))
      .where(eq(auctions.id, id))
      .limit(1);

    if (row) {
      await sendWonEmail({
        to: row.email,
        name: row.name,
        auctionTitle: row.title,
        auctionId: id,
      });
    }
  } catch (e) {
    console.error("[email] won notification failed", e);
  }

  return true;
}
