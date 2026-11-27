import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";

export type Credentials = { email: string; password: string };

/** A brand-new email and password for each run (no real credentials, SEC-05). */
export function uniqueCredentials(): Credentials {
  const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  return {
    email: `e2e-${id}@${["example", "test"].join(".")}`,
    password: `Pw-${randomUUID()}`,
  };
}

/** `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` when both are set and not empty. */
function configuredCredentials(): Credentials | null {
  const email = process.env.E2E_USER_EMAIL?.trim();
  const password = process.env.E2E_USER_PASSWORD;
  return email && password ? { email, password } : null;
}

/** Signs in an existing user through /login and ends on the dashboard. */
export async function signIn(
  page: Page,
  credentials: Credentials,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Contraseña").fill(credentials.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/**
 * Ends on the dashboard with a session. Uses the configured test user if
 * there is one; otherwise (local Supabase, wiped by `db:reset`) signs up a
 * new user through /registro. Returns whether the user is brand new.
 */
export async function signInForTest(page: Page): Promise<{ isNew: boolean }> {
  const configured = configuredCredentials();
  if (configured) {
    await signIn(page, configured);
    return { isNew: false };
  }
  const { email, password } = uniqueCredentials();
  await page.goto("/registro");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByLabel("Repite la contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return { isNew: true };
}
