import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    globals: false,
    // e2e/ son specs de Playwright, no de Vitest; sin esto, Vitest los
    // recoge también por el patrón *.spec.ts y choca con el runner de Playwright.
    // `.next*`: el build `standalone` copia el código (y sus pruebas) dentro de `.next/standalone`; no son pruebas del proyecto.
    exclude: [...configDefaults.exclude, "e2e/**", "**/.next*/**"],
    // PGlite (WASM) arranca varias instancias en paralelo durante la suite
    // completa; el timeout por defecto (5s) alcanza a fallar por contención
    // de CPU aunque cada test, aislado, tarde ~1s.
    testTimeout: 15000,
    hookTimeout: 30000,
    // Cada worker arranca su propio PGlite (WASM); con un worker por núcleo se
    // ahogan entre sí y los beforeAll pasan de 10 s. Con la mitad va más rápido.
    maxWorkers: "50%",
  },
});
