import {config} from "dotenv";
import {drizzle} from "drizzle-orm/postgres-js";
import {migrate} from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Vor den DB-Tests die Migrationen aus ./drizzle auf die Test-DB anwenden
// (idempotent). Ohne gesetzte oder mit der normalen DB identische
// TEST_DATABASE_URL passiert nichts — die Tests werden dann ohnehin übersprungen.
export default async function setup() {
  config({path: ".env.local"});
  const url = process.env.TEST_DATABASE_URL;
  if (!url || url === process.env.DATABASE_URL) return;

  const client = postgres(url, {prepare: false, max: 1});
  try {
    await migrate(drizzle(client), {migrationsFolder: "drizzle"});
  } finally {
    await client.end();
  }
}
