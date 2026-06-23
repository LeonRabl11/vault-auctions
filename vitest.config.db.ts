import {fileURLToPath} from "node:url";
import {defineConfig} from "vitest/config";

// Integrationstests gegen die echte Test-DB (TEST_DATABASE_URL). Bewusst getrennt
// von den schnellen Unit-Tests: lädt .env.local, migriert die Test-DB einmalig
// (globalSetup) und läuft seriell (echte Netz-DB, Row-Lock-Contention).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts"],
    setupFiles: ["./src/test/setup-env.ts"],
    globalSetup: ["./src/test/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
