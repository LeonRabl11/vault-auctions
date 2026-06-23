import {drizzle} from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

// Drizzle-Verbindung gegen die Test-DB — gleicher Treiber/dieselbe Konfiguration
// wie der App-Client (postgres-js, prepare:false für den Supabase-Pooler),
// nur mit anderer URL. max>=2, damit zwei gleichzeitige Transaktionen je eine
// eigene Verbindung bekommen und der Row-Lock echt greift.
export function createTestDb(url: string) {
  const client = postgres(url, {prepare: false, max: 5});
  const db = drizzle(client, {schema});
  return {client, db};
}

// Test-DB-URL nur, wenn gesetzt UND von der normalen DATABASE_URL verschieden —
// sonst null. So laufen DB-Tests NIE versehentlich gegen Dev/Prod.
export function getTestDbUrl(): string | null {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return null;
  if (url === process.env.DATABASE_URL) return null;
  return url;
}
