import {z} from "zod";
import {CATEGORY_SLUGS} from "@/lib/categories";

// Bild-Constraints (auch im Presign-Endpoint erzwungen)
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

// message-Strings sind i18n-Keys (Auctions.errors.*), die im Frontend übersetzt werden.

// Leeres Eingabefeld ("" / null) -> undefined, damit .optional() greift, statt
// dass z.coerce daraus 0 bzw. ein ungültiges Datum macht.
const emptyToUndefined = (v: unknown) =>
  v === "" || v == null ? undefined : v;

// Gemeinsame Felder einer Anzeige. Auktion (startPrice + endsAt) und Festpreis
// (buyNowPrice) sind beide optional — die Refinements unten erzwingen die Regeln.
const listingFields = {
  title: z.string().trim().min(1, "titleRequired"),
  description: z.string().trim().min(1, "descriptionRequired"),
  // Pflicht-Kategorie (Slug aus categories.ts). Leeres Feld -> categoryRequired.
  category: z.enum(CATEGORY_SLUGS, {message: "categoryRequired"}),
  startPriceEur: z.preprocess(
    emptyToUndefined,
    z.coerce.number().positive("pricePositive").optional(),
  ),
  endsAt: z.preprocess(
    emptyToUndefined,
    z.coerce
      .date()
      .refine((d) => d.getTime() > Date.now(), "endInFuture")
      .optional(),
  ),
  buyNowPriceEur: z.preprocess(
    emptyToUndefined,
    z.coerce.number().positive("pricePositive").optional(),
  ),
};

// Regeln über beide Blöcke hinweg:
// 1. Auktionsblock ist "beides oder nichts" (Startpreis ohne Laufzeit ergibt
//    keine Auktion und umgekehrt).
// 2. Mindestens ein Block (Auktion ODER Festpreis) muss ausgefüllt sein.
type ListingDraft = {
  startPriceEur?: number;
  endsAt?: Date;
  buyNowPriceEur?: number;
};

const auctionBlockComplete = (d: ListingDraft) =>
  (d.startPriceEur == null) === (d.endsAt == null);
const hasAtLeastOneBlock = (d: ListingDraft) =>
  d.startPriceEur != null || d.buyNowPriceEur != null;

const incomplete = {message: "auctionIncomplete", path: ["startPriceEur"]};
const missing = {message: "atLeastOne", path: ["startPriceEur"]};

// Formular-Eingabe (Preise in Euro, wie im Feld eingegeben)
export const auctionInputSchema = z
  .object(listingFields)
  .refine(auctionBlockComplete, incomplete)
  .refine(hasAtLeastOneBlock, missing);

// Server-Schema: zusätzlich die fertige S3-Bild-URL
export const createAuctionSchema = z
  .object({...listingFields, imageUrl: z.string().url()})
  .refine(auctionBlockComplete, incomplete)
  .refine(hasAtLeastOneBlock, missing);

// Presign-Anfrage des Browsers
export const presignSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.number().int().positive().max(MAX_IMAGE_BYTES),
});

export type AuctionInput = z.infer<typeof auctionInputSchema>;
