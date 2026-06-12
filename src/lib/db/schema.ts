import {relations} from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Status-Enums (siehe docs/KONZEPT.md §4)
export const auctionStatus = pgEnum("auction_status", [
  "active",
  "ended",
  "paid",
]);
export const orderStatus = pgEnum("order_status", ["pending", "paid"]);

// User
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", {withTimezone: true})
    .notNull()
    .defaultNow(),
});

// Auction — Beträge immer als Integer in Cent
export const auctions = pgTable("auctions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => users.id, {onDelete: "cascade"}),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  startPrice: integer("start_price").notNull(), // in Cent
  currentPrice: integer("current_price").notNull(), // aktuelles Höchstgebot, in Cent
  endsAt: timestamp("ends_at", {withTimezone: true}).notNull(),
  status: auctionStatus("status").notNull().default("active"),
  winnerId: uuid("winner_id").references(() => users.id, {
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
  bidderId: uuid("bidder_id")
    .notNull()
    .references(() => users.id, {onDelete: "cascade"}),
  amount: integer("amount").notNull(), // in Cent
  createdAt: timestamp("created_at", {withTimezone: true})
    .notNull()
    .defaultNow(),
});

// Order — buyerId = winnerId der Auktion
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  auctionId: uuid("auction_id")
    .notNull()
    .references(() => auctions.id, {onDelete: "cascade"}),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => users.id, {onDelete: "cascade"}),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  status: orderStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", {withTimezone: true})
    .notNull()
    .defaultNow(),
});

// Relations (für relationale Drizzle-Queries)
export const usersRelations = relations(users, ({many}) => ({
  auctions: many(auctions, {relationName: "seller"}),
  bids: many(bids),
  orders: many(orders),
}));

export const auctionsRelations = relations(auctions, ({one, many}) => ({
  seller: one(users, {
    fields: [auctions.sellerId],
    references: [users.id],
    relationName: "seller",
  }),
  winner: one(users, {
    fields: [auctions.winnerId],
    references: [users.id],
  }),
  bids: many(bids),
  order: one(orders),
}));

export const bidsRelations = relations(bids, ({one}) => ({
  auction: one(auctions, {
    fields: [bids.auctionId],
    references: [auctions.id],
  }),
  bidder: one(users, {
    fields: [bids.bidderId],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({one}) => ({
  auction: one(auctions, {
    fields: [orders.auctionId],
    references: [auctions.id],
  }),
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
  }),
}));
