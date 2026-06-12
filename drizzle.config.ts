import {config} from "dotenv";
import {defineConfig} from "drizzle-kit";

// drizzle-kit (CLI) lädt .env.local nicht automatisch — die App schon.
config({path: ".env.local"});

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
