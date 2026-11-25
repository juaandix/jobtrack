import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-config-next already registers the jsx-a11y plugin, so only the
    // rules of its `recommended` config are applied here (A11Y-01, A11Y-02).
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "e2e/**"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "error",
    },
  },
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
