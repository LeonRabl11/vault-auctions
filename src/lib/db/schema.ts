import {relations} from "drizzle-orm";
import {integer, pgEnum, pgTable, text, timestamp, uuid} from "drizzle-orm/pg-core";
import {user} from "./auth-schema";

// Better Auth verwaltet user/session/account/verification (siehe auth-schema.ts)
export * from "./auth-schema";

// Status-Enums (siehe docs/KONZEPT.md §4)
export const auctionStatus = pgEnum("auction_status", [
  "active",
  "ended",
  "paid",
]);
export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "expired",
]);

// Auction — Beträge immer als Integer in Cent, FKs auf Better Auths user.id (text)
export const auctions = pgTable("auctions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sellerId: text("seller_id")
    .notNull()
    .references(() => user.id, {onDelete: "cascade"}),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  // Auktionsteil — optional. Nur gesetzt, wenn die Anzeige eine Auktion ist.
  startPrice: integer("start_price"), // in Cent, null = keine Auktion
  currentPrice: integer("current_price"), // aktuelles Höchstgebot in Cent, null = keine Auktion
  endsAt: timestamp("ends_at", {withTimezone: true}), // null = keine Auktion (kein Auto-Ende)
  // Festpreis / Sofort-Kauf — optional. Mindestens einer von Auktion/buyNowPrice ist gesetzt.
  buyNowPrice: integer("buy_now_price"), // in Cent, null = kein Sofort-Kauf
  status: auctionStatus("status").notNull().default("active"),
  winnerId: text("winner_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", {withTimezone: true})
    .notNull()
    .defaultNow(),
});

// Bid — amount in Cent
export const bids = pgTable("bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  auctionId: uuid("auction_id")
    .notNull()
    .references(() => auctions.id, {onDelete: "cascade"}),
  bidderId: text("bidder_id")
    .notNull()
    .references(() => user.id, {onDelete: "cascade"}),
  amount: integer("amount").notNull(), // in Cent
  createdAt: timestamp("created_at", {withTimezone: true})
    .notNull()
    .defaultNow(),
});

// Order — eine pro Auktion (unique auctionId); buyerId = winnerId der Auktion
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  auctionId: uuid("auction_id")
    .notNull()
    .unique()
    .references(() => auctions.id, {onDelete: "cascade"}),
  buyerId: text("buyer_id")
    .notNull()
    .references(() => user.id, {onDelete: "cascade"}),
  amount: integer("amount").notNull(), // Schlusspreis in Cent
  stripeSessionId: text("stripe_session_id").unique(), // erst beim Checkout gesetzt
  status: orderStatus("status").notNull().default("pending"),
  paymentDueAt: timestamp("payment_due_at", {withTimezone: true}).notNull(),
  createdAt: timestamp("created_at", {withTimezone: true})
    .notNull()
    .defaultNow(),
});

// Relations: nur die one-Seite zu user (userRelations bleibt in auth-schema.ts)
export const auctionsRelations = relations(auctions, ({one, many}) => ({
  seller: one(user, {
    fields: [auctions.sellerId],
    references: [user.id],
    relationName: "seller",
  }),
  winner: one(user, {
    fields: [auctions.winnerId],
    references: [user.id],
    relationName: "winner",
  }),
  bids: many(bids),
  order: one(orders),
}));

export const bidsRelations = relations(bids, ({one}) => ({
  auction: one(auctions, {
    fields: [bids.auctionId],
    references: [auctions.id],
  }),
  bidder: one(user, {
    fields: [bids.bidderId],
    references: [user.id],
  }),
}));

export const ordersRelations = relations(orders, ({one}) => ({
  auction: one(auctions, {
    fields: [orders.auctionId],
    references: [auctions.id],
  }),
  buyer: one(user, {
    fields: [orders.buyerId],
    references: [user.id],
  }),
}));
