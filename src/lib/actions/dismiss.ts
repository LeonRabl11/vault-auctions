"use server";

import {revalidatePath} from "next/cache";
import {headers} from "next/headers";
import {z} from "zod";
import {auth} from "@/lib/auth";
import {db, dismissals} from "@/lib/db";

export type DismissSection = "bidding" | "won";
export type DismissResult = {ok: true} | {ok: false; error: string};

const inputSchema = z.object({
  auctionId: z.string().uuid(),
  section: z.enum(["bidding", "won"]),
});

/**
 * Blendet eine Anzeige für den eingeloggten Nutzer aus einem Dashboard-Bereich
 * aus (reine View-Einstellung). Idempotent über onConflictDoNothing — mehrfaches
 * Ausblenden ist harmlos. Gebote/Orders bleiben unangetastet.
 */
export async function dismissEntry(input: unknown): Promise<DismissResult> {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session) {
    return {ok: false, error: "unauthorized"};
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {ok: false, error: "invalid"};
  }
  const {auctionId, section} = parsed.data;

  try {
    await db
      .insert(dismissals)
      .values({userId: session.user.id, auctionId, section})
      .onConflictDoNothing();
  } catch {
    return {ok: false, error: "generic"};
  }

  revalidatePath("/[locale]/dashboard", "page");
  return {ok: true};
}
