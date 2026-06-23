import {fileURLToPath} from "node:url";
import {defineConfig} from "vitest/config";

// Reine Unit-Tests laufen im Node-Environment (keine DB/keine Browser-APIs).
// Pfad-Alias @/* spiegelt tsconfig (./src/*).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
