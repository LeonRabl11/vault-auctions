import {fileURLToPath} from "node:url";
import {configDefaults, defineConfig} from "vitest/config";

// Schnelle, reine Unit-Tests im Node-Environment (keine DB/keine Browser-APIs).
// DB-Tests (*.db.test.ts) sind ausgeschlossen — die laufen über vitest.config.db.ts
// (pnpm test:db). Pfad-Alias @/* spiegelt tsconfig (./src/*).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/*.db.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
