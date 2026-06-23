import {randomUUID} from "node:crypto";
import {eq, inArray} from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import * as schema from "@/lib/db/schema";
import {placeBidTransaction} from "@/lib/bids";
import {createTestDb, getTestDbUrl} from "@/test/test-db";

const url = getTestDbUrl();
const {auctions, bids, user} = schema;

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const START = 10000; // 100,00 €
const BID = 15000; // 150,00 €

// Übersprungen, wenn keine (eigene) Test-DB konfiguriert ist — siehe getTestDbUrl.
describe.skipIf(!url)("placeBidTransaction — Nebenläufigkeit (Test-DB)", () => {
  let conn: ReturnType<typeof createTestDb>;

  // Verbindung erst hier aufbauen, damit beim Überspringen kein Connect erfolgt.
  beforeAll(() => {
    conn = createTestDb(url!);
  });

  afterAll(async () => {
    await conn.client.end();
  });

  let sellerId: string;
  let bidder1: string;
  let bidder2: string;
  let auctionId: string;

  // Frische, eindeutige Testdaten je Test: 1 Verkäufer, 2 Bieter, 1 aktive Auktion.
  beforeEach(async () => {
    sellerId = randomUUID();
    bidder1 = randomUUID();
    bidder2 = randomUUID();
    auctionId = randomUUID();

    await conn.db.insert(user).values([
      {id: sellerId, name: "Seller", email: `seller-${sellerId}@test.local`},
      {id: bidder1, name: "Bidder 1", email: `b1-${bidder1}@test.local`},
      {id: bidder2, name: "Bidder 2", email: `b2-${bidder2}@test.local`},
    ]);
    await conn.db.insert(auctions).values({
      id: auctionId,
      sellerId,
      title: "Concurrency Test",
      description: "Test-Auktion",
      category: "sonstiges",
      startPrice: START,
      currentPrice: START,
      endsAt: FUTURE,
      status: "active",
    });
  });

  // Nur die im Test angelegten Daten entfernen (per ID), nichts anderes.
  afterEach(async () => {
    await conn.db.delete(bids).where(eq(bids.auctionId, auctionId));
    await conn.db.delete(auctions).where(eq(auctions.id, auctionId));
    await conn.db
      .delete(user)
      .where(inArray(user.id, [sellerId, bidder1, bidder2]));
  });

  it("zwei gleichzeitige identische Gebote → genau eines gewinnt", async () => {
    const [r1, r2] = await Promise.all([
      placeBidTransaction(conn.db, {auctionId, userId: bidder1, amount: BID}),
      placeBidTransaction(conn.db, {auctionId, userId: bidder2, amount: BID}),
    ]);

    const ok = [r1, r2].filter((r) => r.ok);
    const failed = [r1, r2].filter((r) => !r.ok);
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    // Das unterlegene Gebot scheitert an tooLow: currentPrice ist bereits 150 €.
    expect(failed[0]).toMatchObject({ok: false, error: "tooLow"});

    // currentPrice der Auktion = 150 €
    const [a] = await conn.db
      .select({currentPrice: auctions.currentPrice})
      .from(auctions)
      .where(eq(auctions.id, auctionId));
    expect(a.currentPrice).toBe(BID);

    // Genau EIN Gebot in der bids-Tabelle, und es gehört dem Gewinner.
    const placed = await conn.db
      .select({bidderId: bids.bidderId, amount: bids.amount})
      .from(bids)
      .where(eq(bids.auctionId, auctionId));
    expect(placed).toHaveLength(1);
    expect(placed[0].amount).toBe(BID);
    expect([bidder1, bidder2]).toContain(placed[0].bidderId);
  });

  it("fünf gleichzeitige identische Gebote → genau eines akzeptiert", async () => {
    const extra = Array.from({length: 5}, () => randomUUID());
    await conn.db.insert(user).values(
      extra.map((id, i) => ({
        id,
        name: `Bidder N${i}`,
        email: `n-${id}@test.local`,
      })),
    );

    try {
      const results = await Promise.all(
        extra.map((id) =>
          placeBidTransaction(conn.db, {auctionId, userId: id, amount: BID}),
        ),
      );

      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.filter((r) => !r.ok)).toHaveLength(4);

      const placed = await conn.db
        .select({bidderId: bids.bidderId})
        .from(bids)
        .where(eq(bids.auctionId, auctionId));
      expect(placed).toHaveLength(1);
      expect(extra).toContain(placed[0].bidderId);
    } finally {
      // Diese Zusatz-Bieter fängt afterEach nicht ab -> hier säubern (cascadet Bids).
      await conn.db.delete(bids).where(eq(bids.auctionId, auctionId));
      await conn.db.delete(user).where(inArray(user.id, extra));
    }
  });
});
