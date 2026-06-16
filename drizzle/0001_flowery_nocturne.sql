ALTER TYPE "public"."order_status" ADD VALUE 'expired';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "stripe_session_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "amount" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_due_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_auction_id_unique" UNIQUE("auction_id");