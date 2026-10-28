// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
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
