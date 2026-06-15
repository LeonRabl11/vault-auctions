import {z} from "zod";

// Gebot-Eingabe: Betrag in Euro (wird in der Action in Cent umgerechnet).
// Der Vergleich gegen currentPrice passiert dynamisch in der Server Action.
export const bidInputSchema = z.object({
  auctionId: z.string().uuid(),
  amountEur: z.coerce.number().positive("tooLow"),
});

export type BidInput = z.infer<typeof bidInputSchema>;
