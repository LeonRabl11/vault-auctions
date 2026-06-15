import {z} from "zod";

// Bild-Constraints (auch im Presign-Endpoint erzwungen)
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

// message-Strings sind i18n-Keys (Auctions.errors.*), die im Frontend übersetzt werden.

// Formular-Eingabe (Startpreis in Euro, wie im Feld eingegeben)
export const auctionInputSchema = z.object({
  title: z.string().trim().min(1, "titleRequired"),
  description: z.string().trim().min(1, "descriptionRequired"),
  startPriceEur: z.coerce.number().positive("pricePositive"),
  endsAt: z.coerce
    .date()
    .refine((d) => d.getTime() > Date.now(), "endInFuture"),
});

// Server-Schema: zusätzlich die fertige S3-Bild-URL
export const createAuctionSchema = auctionInputSchema.extend({
  imageUrl: z.string().url(),
});

// Presign-Anfrage des Browsers
export const presignSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.number().int().positive().max(MAX_IMAGE_BYTES),
});

export type AuctionInput = z.infer<typeof auctionInputSchema>;
