import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";

export default tseslint.config(
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: [
      "dist",
      ".storybook",
      "coverage",
      "opt",
      "public/mockServiceWorker.js",
      "src/generated",
    ],
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    ignores: ["src/components/ui/*"],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    settings: { react: { version: "19.0.0" } },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "./**/*.ts",
                "./**/*.tsx",
                "../**/*.ts",
                "../**/*.tsx",
                "@/components/**/*.ts",
                "@/components/**/*.tsx",
                "@/generated/**/*.ts",
                "@/generated/**/*.tsx",
                "@/hooks/**/*.ts",
                "@/hooks/**/*.tsx",
                "@/lib/**/*.ts",
                "@/lib/**/*.tsx",
                "@/pages/**/*.ts",
                "@/pages/**/*.tsx",
                "@/utils/**/*.ts",
                "@/utils/**/*.tsx",
              ],
              message: "Omit TypeScript file extensions from local imports.",
            },
          ],
        },
      ],
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/incompatible-library": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
);
