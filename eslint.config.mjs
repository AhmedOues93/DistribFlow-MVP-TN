import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([".next/**", "node_modules/**", "generated/**"]),
  { files: ["**/*.{js,mjs}"], rules: { "no-undef": "error", "no-unused-vars": "error" } }
]);
