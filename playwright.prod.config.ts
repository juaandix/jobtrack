import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/*
 * Smoke test against a deployed JobTrack (`npm run e2e:prod`). Kept out of
 * `npm run e2e` (its files are `*.prod.ts`, not `*.spec.ts`) and starts no
 * local server: it targets PLAYWRIGHT_BASE_URL, or the production URL when
 * that variable is empty. It never signs up users there, so it requires an
 * existing test user in E2E_PROD_USER_EMAIL / E2E_PROD_USER_PASSWORD (SEC-05),
 * separate from the E2E_USER_* of the local `npm run e2e`.
 */

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const PRODUCTION_URL = "https://jobtrack-brown-two.vercel.app";

function exitWithError(message: string): never {
  console.error(`\ne2e:prod: ${message}\n`);
  process.exit(1);
}

if (
  !process.env.E2E_PROD_USER_EMAIL?.trim() ||
  !process.env.E2E_PROD_USER_PASSWORD
) {
  exitWithError(
    "faltan E2E_PROD_USER_EMAIL y/o E2E_PROD_USER_PASSWORD. Define las credenciales de " +
      "un usuario de prueba que ya exista en el entorno desplegado (en " +
      ".env.local o en el entorno). El smoke no registra usuarios nuevos.",
  );
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL?.trim() || PRODUCTION_URL;
if (!URL.canParse(baseURL) || !/^https?:$/.test(new URL(baseURL).protocol)) {
  exitWithError(`PLAYWRIGHT_BASE_URL no es una URL http(s) válida: ${baseURL}`);
}

export default defineConfig({
  testDir: "e2e/production",
  testMatch: "*.prod.ts",
  outputDir: "test-results/prod",
  reporter: "list",
  // One worker and no retries: each run creates (and deletes) a single
  // application in the real database.
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
