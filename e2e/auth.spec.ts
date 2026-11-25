import { expect, test, type Page } from "@playwright/test";
import { uniqueCredentials } from "./support/auth";

// Needs the local Supabase running (`npm run db:start`) with email
// confirmation disabled, and its URL and public key in .env.local. Each run
// signs up a brand-new user, so no real credentials are involved (SEC-05).

async function logIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

test("sin sesión, /dashboard lleva a /login conservando el destino", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Iniciar sesión" }),
  ).toBeVisible();
});

test("registro, cierre de sesión e inicio de sesión", async ({ page }) => {
  const { email, password } = uniqueCredentials();

  await test.step("crea la cuenta y entra en el dashboard", async () => {
    await page.goto("/registro");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByLabel("Repite la contraseña").fill(password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Mis candidaturas" }),
    ).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Principal" });
    await expect(nav.getByText(email)).toBeVisible();
  });

  await test.step("cierra la sesión", async () => {
    await page.getByRole("button", { name: "Cerrar sesión" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  });

  await test.step("con una contraseña incorrecta muestra un error", async () => {
    await logIn(page, email, `${password}-mal`);

    // Next.js adds its own empty route announcer with role="alert".
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Email o contraseña incorrectos" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(email);
  });

  await test.step("inicia sesión y vuelve al dashboard", async () => {
    await logIn(page, email, password);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Mis candidaturas" }),
    ).toBeVisible();
  });
});

test("el registro valida en el navegador sin enviar el formulario", async ({
  page,
}) => {
  await page.goto("/registro");
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page.getByLabel("Email")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByText("Introduce tu email")).toBeVisible();
  await expect(page).toHaveURL(/\/registro$/);
});
