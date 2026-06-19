ALTER TABLE "auctions" ALTER COLUMN "start_price" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "auctions" ALTER COLUMN "current_price" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "auctions" ALTER COLUMN "ends_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "buy_now_price" integer;