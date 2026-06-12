import {drizzle} from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL ist nicht gesetzt (siehe .env.example).");
}

// prepare: false ist nötig für den Supabase Transaction-Pooler (PgBouncer).
const client = postgres(databaseUrl, {prepare: false});

export const db = drizzle(client, {schema});

export * from "./schema";
