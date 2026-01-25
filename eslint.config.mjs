import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    ".open-next/**",
    "dist/**",
    "next-env.d.ts",
    "build/**",
    ".wrangler/**",
  ]),
]);

export default eslintConfig;
