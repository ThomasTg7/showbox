import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-e2e/**",
    // Servidores de revisión (`E2E_DIST_DIR=.next-review…`, docs/WORKFLOW.md).
    ".next-review*/**",
    // Local agent review artifacts are outside the application source.
    ".superpowers/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Los drivers implementan una interfaz común; un argumento que no usan se nombra con `_`.
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
]);

export default eslintConfig;
