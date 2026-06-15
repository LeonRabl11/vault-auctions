import {createHash, timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {and, eq, lte} from "drizzle-orm";
import {auctions, db} from "@/lib/db";
import {finalizeAuction} from "@/lib/auctions";

// Kein Caching; Postgres-Treiber braucht die Node-Runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Zeitkonstanter Vergleich: beide Seiten auf gleiche Länge hashen, dann
// timingSafeEqual (verrät weder Länge noch Inhalt über die Laufzeit).
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || !authHeader || !safeEqual(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({error: "unauthorized"}, {status: 401});
  }

  // Abgelaufene, noch aktive Auktionen einsammeln
  const expired = await db
    .select({id: auctions.id})
    .from(auctions)
    .where(and(eq(auctions.status, "active"), lte(auctions.endsAt, new Date())));

  // Sequenziell finalisieren (jede Auktion mit Transaktion + FOR UPDATE in
  // finalizeAuction — keine Logik-Duplizierung, schont den Connection-Pool)
  let finalized = 0;
  for (const {id} of expired) {
    if (await finalizeAuction(id)) {
      finalized++;
    }
  }

  return NextResponse.json({finalized});
}
