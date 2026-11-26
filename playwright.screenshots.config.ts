import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/*
 * Screenshots of the main views for the README (`npm run screenshots`). Kept
 * out of `npm run e2e` (its files are `*.screenshots.ts`, not `*.spec.ts`) so
 * the versioned images in docs/screenshots/ only change when regenerated on
 * purpose. Uses a production build, so no dev overlay shows up in them.
 */

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e/screenshots",
  testMatch: "*.screenshots.ts",
  outputDir: "test-results/screenshots",
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL,
    colorScheme: "light",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
  },
  projects: [
    {
      name: "1280",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "375",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
