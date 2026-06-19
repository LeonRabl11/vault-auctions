CREATE TYPE "public"."dismissal_section" AS ENUM('bidding', 'won');--> statement-breakpoint
CREATE TABLE "dismissals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"auction_id" uuid NOT NULL,
	"section" "dismissal_section" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dismissals_user_id_auction_id_section_unique" UNIQUE("user_id","auction_id","section")
);
--> statement-breakpoint
ALTER TABLE "dismissals" ADD CONSTRAINT "dismissals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dismissals" ADD CONSTRAINT "dismissals_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE cascade ON UPDATE no action;