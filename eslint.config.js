// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import eslintPluginAstro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintPluginAstro.configs.recommended,
  { ignores: [".astro/*", "tmp/*", "dist/*"] },
  { languageOptions: { globals: globals.node } },
  {
    rules: {
      complexity: "warn",
      "no-console": [
        "error",
        {
          allow: ["warn", "error", "info"],
        },
      ],
    },
  },
);
