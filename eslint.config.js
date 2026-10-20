import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["_site/", "coverage/", "node_modules/", ".wrangler/", "playwright-report/", "test-results/", ".cache/"] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
  {
    files: ["src/js/**/*.js"],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ["worker/**/*.js"],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
];
