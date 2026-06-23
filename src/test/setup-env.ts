import {config} from "dotenv";

// .env.local laden (gleiche Quelle wie drizzle.config/Seed), damit
// TEST_DATABASE_URL und DATABASE_URL in den DB-Tests verfügbar sind.
config({path: ".env.local"});
