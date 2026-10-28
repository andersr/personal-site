// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  // Directory patterns (not `build/*`) so ESLint never scans dirs that the
  // parallel `build`/`typegen` in `checks` delete and recreate
  { ignores: ["build/", ".react-router/"] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
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
