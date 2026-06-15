"use server";

import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {auctions, db} from "@/lib/db";
import {getS3Config} from "@/lib/s3";
import {createAuctionSchema} from "@/lib/validation/auction";

export type CreateAuctionResult =
  | {ok: true; id: string}
  | {ok: false; error: string};

export async function createAuction(
  input: unknown,
): Promise<CreateAuctionResult> {
  // Nur eingeloggte Nutzer dürfen Auktionen anlegen
  const session = await auth.api.getSession({headers: await headers()});
  if (!session) {
    return {ok: false, error: "unauthorized"};
  }

  // Serverseitige Validierung (Frontend-Checks sind nur UX)
  const parsed = createAuctionSchema.safeParse(input);
  if (!parsed.success) {
    return {ok: false, error: parsed.error.issues[0]?.message ?? "generic"};
  }

  const {title, description, startPriceEur, endsAt, imageUrl} = parsed.data;

  // Bild-URL muss aus unserem Bucket stammen (keine Fremd-URLs speichern)
  const {bucket, region} = getS3Config();
  const expectedPrefix = `https://${bucket}.s3.${region}.amazonaws.com/`;
  if (!imageUrl.startsWith(expectedPrefix)) {
    return {ok: false, error: "generic"};
  }

  // € -> Cent (Beträge laut Konvention immer als Integer in Cent)
  const startPrice = Math.round(startPriceEur * 100);

  const [created] = await db
    .insert(auctions)
    .values({
      sellerId: session.user.id,
      title,
      description,
      imageUrl,
      startPrice,
      currentPrice: startPrice, // Startgebot = Startpreis
      endsAt,
      // status: 'active' kommt aus dem Schema-Default
    })
    .returning({id: auctions.id});

  return {ok: true, id: created.id};
}
