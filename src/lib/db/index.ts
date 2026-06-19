import {drizzle} from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL ist nicht gesetzt (siehe .env.example).");
}

// prepare: false ist nötig für den Supabase Transaction-Pooler (PgBouncer).
// max: 5 hält den Verbrauch klein — der geteilte Pooler (Session-Mode) erlaubt
// nur 15 Clients; mit dem Default (10) lief er regelmäßig voll.
const client = postgres(databaseUrl, {prepare: false, max: 5});

export const db = drizzle(client, {schema});

export * from "./schema";
