"use server";

import {revalidatePath} from "next/cache";
import {headers} from "next/headers";
import {DeleteObjectCommand} from "@aws-sdk/client-s3";
import {and, eq, notExists, sql} from "drizzle-orm";
import {z} from "zod";
import {auth} from "@/lib/auth";
import {auctions, bids, db} from "@/lib/db";
import {getS3Client, getS3Config} from "@/lib/s3";
import {createAuctionSchema} from "@/lib/validation/auction";

export type CreateAuctionResult =
  | {ok: true; id: string}
  | {ok: false; error: string};

export type DeleteAuctionResult = {ok: true} | {ok: false; error: string};

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

  const {
    title,
    description,
    category,
    startPriceEur,
    endsAt,
    buyNowPriceEur,
    imageUrl,
  } = parsed.data;

  // Bild-URL muss aus unserem Bucket stammen (keine Fremd-URLs speichern)
  const {bucket, region} = getS3Config();
  const expectedPrefix = `https://${bucket}.s3.${region}.amazonaws.com/`;
  if (!imageUrl.startsWith(expectedPrefix)) {
    return {ok: false, error: "generic"};
  }

  // € -> Cent (Beträge laut Konvention immer als Integer in Cent).
  // Auktions- und Festpreis-Block sind je optional (Schema erzwingt: mind. einer).
  const startPrice =
    startPriceEur != null ? Math.round(startPriceEur * 100) : null;
  const buyNowPrice =
    buyNowPriceEur != null ? Math.round(buyNowPriceEur * 100) : null;

  const [created] = await db
    .insert(auctions)
    .values({
      sellerId: session.user.id,
      title,
      description,
      category,
      imageUrl,
      startPrice,
      currentPrice: startPrice, // Startgebot = Startpreis (null ohne Auktion)
      endsAt: endsAt ?? null, // null = reine Festpreis-Anzeige, kein Auto-Ende
      buyNowPrice,
      // status: 'active' kommt aus dem Schema-Default
    })
    .returning({id: auctions.id});

  // Liste vorab revalidieren, damit die neue Anzeige (createdAt DESC -> oben)
  // sofort erscheint, wenn der Client gleich auf /marktplatz weiterleitet.
  revalidatePath("/[locale]/marktplatz", "page");

  return {ok: true, id: created.id};
}

/**
 * Eigene Auktion löschen — nur durch den Verkäufer und nur ohne Gebote.
 *
 * Der No-Bids-Check läuft race-sicher als ein konditionales DELETE:
 * gelöscht wird nur, wenn id + sellerId passen UND kein Gebot zur Auktion
 * existiert (NOT EXISTS). 0 betroffene Zeilen => kein Recht oder bereits
 * Gebote vorhanden -> Fehler. Genau eine Zeile => Erfolg.
 */
export async function deleteAuction(id: unknown): Promise<DeleteAuctionResult> {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session) {
    return {ok: false, error: "unauthorized"};
  }

  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return {ok: false, error: "invalid"};
  }
  const auctionId = parsed.data;

  let deletedImageUrl: string | null = null;
  try {
    const deleted = await db
      .delete(auctions)
      .where(
        and(
          eq(auctions.id, auctionId),
          eq(auctions.sellerId, session.user.id),
          notExists(
            db
              .select({one: sql`1`})
              .from(bids)
              .where(eq(bids.auctionId, auctionId)),
          ),
        ),
      )
      .returning({imageUrl: auctions.imageUrl});

    if (deleted.length === 0) {
      // Kein Recht (nicht der Verkäufer / nicht vorhanden) oder schon Gebote
      return {ok: false, error: "notAllowed"};
    }
    deletedImageUrl = deleted[0].imageUrl;
  } catch {
    return {ok: false, error: "generic"};
  }

  // Bild aus S3 mitlöschen (Best-Effort — Fehler darf den Flow nicht kippen).
  try {
    const {bucket, region} = getS3Config();
    const prefix = `https://${bucket}.s3.${region}.amazonaws.com/`;
    if (deletedImageUrl.startsWith(prefix)) {
      const key = deletedImageUrl.slice(prefix.length);
      await getS3Client().send(
        new DeleteObjectCommand({Bucket: bucket, Key: key}),
      );
    }
  } catch (e) {
    console.error("[s3] image delete failed", e);
  }

  // Liste + Dashboard revalidieren (Anzeige verschwindet überall)
  revalidatePath("/[locale]/marktplatz", "page");
  revalidatePath("/[locale]/dashboard", "page");

  return {ok: true};
}
