"use server";

import {revalidatePath} from "next/cache";
import {headers} from "next/headers";
import {and, eq, notExists, sql} from "drizzle-orm";
import {z} from "zod";
import {auth} from "@/lib/auth";
import {auctions, bids, db} from "@/lib/db";
import {deleteObjectByUrl, isOwnBucketUrl} from "@/lib/s3";
import {toCents} from "@/lib/money";
import {auctionInputSchema} from "@/lib/validation/auction";

// Optionale Bild-URL prüfen: leer/fehlend -> null (kein Bild), sonst muss sie aus
// unserem Bucket stammen. Gibt {ok:false} bei einer Fremd-URL zurück.
function normalizeImageUrl(
  value: unknown,
): {ok: true; url: string | null} | {ok: false} {
  if (value == null || value === "") return {ok: true, url: null};
  if (typeof value !== "string" || !isOwnBucketUrl(value)) return {ok: false};
  return {ok: true, url: value};
}

// € -> Cent oder null (Auktions- bzw. Festpreis-Teil sind je optional).
const toCentsOrNull = (eur?: number) => (eur != null ? toCents(eur) : null);

export type CreateAuctionResult =
  | {ok: true; id: string}
  | {ok: false; error: string};

export type UpdateAuctionResult = {ok: true} | {ok: false; error: string};

export type DeleteAuctionResult = {ok: true} | {ok: false; error: string};

export async function createAuction(
  input: unknown,
): Promise<CreateAuctionResult> {
  // Nur eingeloggte Nutzer dürfen Auktionen anlegen
  const session = await auth.api.getSession({headers: await headers()});
  if (!session) {
    return {ok: false, error: "unauthorized"};
  }

  // Serverseitige Validierung der Felder (Frontend-Checks sind nur UX)
  const parsed = auctionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {ok: false, error: parsed.error.issues[0]?.message ?? "generic"};
  }

  // Bild optional — leer erlaubt, sonst muss die URL aus unserem Bucket stammen.
  const image = normalizeImageUrl((input as {imageUrl?: unknown}).imageUrl);
  if (!image.ok) {
    return {ok: false, error: "generic"};
  }

  const {title, description, category, startPriceEur, endsAt, buyNowPriceEur} =
    parsed.data;
  const startPrice = toCentsOrNull(startPriceEur);

  const [created] = await db
    .insert(auctions)
    .values({
      sellerId: session.user.id,
      title,
      description,
      category,
      imageUrl: image.url,
      startPrice,
      currentPrice: startPrice, // Startgebot = Startpreis (null ohne Auktion)
      endsAt: endsAt ?? null, // null = reine Festpreis-Anzeige, kein Auto-Ende
      buyNowPrice: toCentsOrNull(buyNowPriceEur),
      // status: 'active' kommt aus dem Schema-Default
    })
    .returning({id: auctions.id});

  // Liste vorab revalidieren, damit die neue Anzeige (createdAt DESC -> oben)
  // sofort erscheint, wenn der Client gleich auf /marktplatz weiterleitet.
  revalidatePath("/[locale]/marktplatz", "page");

  return {ok: true, id: created.id};
}

/**
 * Eigene Anzeige bearbeiten. Nur der Verkäufer (sonst "forbidden") und nur bei
 * status='active' (sonst "notEditable"). Liegt bereits mindestens ein Gebot vor,
 * werden Preis-/Laufzeit-/Typ-Felder serverseitig ignoriert — nur Titel,
 * Beschreibung, Kategorie und Bild ändern sich. Alles in einer Transaktion mit
 * Row-Lock (FOR UPDATE). Wechselt das Bild, wird das alte S3-Objekt best-effort
 * gelöscht.
 */
export async function updateAuction(
  input: unknown,
): Promise<UpdateAuctionResult> {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session) {
    return {ok: false, error: "unauthorized"};
  }

  const idParsed = z.string().uuid().safeParse((input as {id?: unknown}).id);
  if (!idParsed.success) {
    return {ok: false, error: "invalid"};
  }
  const auctionId = idParsed.data;

  // Gleiche Feld-Validierung wie beim Erstellen (geteiltes Schema).
  const parsed = auctionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {ok: false, error: parsed.error.issues[0]?.message ?? "generic"};
  }

  // Bild optional; null = entfernen. Fremd-URLs ablehnen.
  const image = normalizeImageUrl((input as {imageUrl?: unknown}).imageUrl);
  if (!image.ok) {
    return {ok: false, error: "generic"};
  }

  const {title, description, category, startPriceEur, endsAt, buyNowPriceEur} =
    parsed.data;

  let oldImageUrl: string | null = null;
  let result: UpdateAuctionResult = {ok: false, error: "generic"};

  await db.transaction(async (tx) => {
    const [a] = await tx
      .select({
        sellerId: auctions.sellerId,
        status: auctions.status,
        imageUrl: auctions.imageUrl,
      })
      .from(auctions)
      .where(eq(auctions.id, auctionId))
      .for("update")
      .limit(1);

    if (!a) {
      result = {ok: false, error: "notFound"};
      return;
    }
    if (a.sellerId !== session.user.id) {
      result = {ok: false, error: "forbidden"};
      return;
    }
    if (a.status !== "active") {
      result = {ok: false, error: "notEditable"};
      return;
    }

    // Gebote vorhanden? Dann Preis/Laufzeit/Typ sperren (serverseitig erzwungen).
    const [bid] = await tx
      .select({one: sql`1`})
      .from(bids)
      .where(eq(bids.auctionId, auctionId))
      .limit(1);
    const hasBids = Boolean(bid);

    // Beschreibende Felder sind immer änderbar.
    const descriptive = {title, description, category, imageUrl: image.url};

    if (hasBids) {
      await tx
        .update(auctions)
        .set(descriptive)
        .where(eq(auctions.id, auctionId));
    } else {
      const startPrice = toCentsOrNull(startPriceEur);
      await tx
        .update(auctions)
        .set({
          ...descriptive,
          startPrice,
          currentPrice: startPrice, // ohne Gebote = Startpreis (null = keine Auktion)
          endsAt: endsAt ?? null,
          buyNowPrice: toCentsOrNull(buyNowPriceEur),
        })
        .where(eq(auctions.id, auctionId));
    }

    oldImageUrl = a.imageUrl;
    result = {ok: true};
  });

  if (!result.ok) {
    return result;
  }

  // Altes Bild best-effort entfernen, wenn es ersetzt/gelöscht wurde.
  if (oldImageUrl && oldImageUrl !== image.url) {
    try {
      await deleteObjectByUrl(oldImageUrl);
    } catch (e) {
      console.error("[s3] image delete failed", e);
    }
  }

  revalidatePath("/[locale]/marktplatz", "page");
  revalidatePath("/[locale]/marktplatz/[id]", "page");
  revalidatePath("/[locale]/dashboard", "page");

  return {ok: true};
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
  if (deletedImageUrl) {
    try {
      await deleteObjectByUrl(deletedImageUrl);
    } catch (e) {
      console.error("[s3] image delete failed", e);
    }
  }

  // Liste + Dashboard revalidieren (Anzeige verschwindet überall)
  revalidatePath("/[locale]/marktplatz", "page");
  revalidatePath("/[locale]/dashboard", "page");

  return {ok: true};
}
