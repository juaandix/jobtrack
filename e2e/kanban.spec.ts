import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  createApplication,
  deleteApplication,
  expectNoHorizontalScroll,
} from "./support/applications";
import { signInForTest } from "./support/auth";

// Needs the local Supabase running (`npm run db:start`) and its URL and public
// key in .env.local. See e2e/support/auth.ts for how the user is obtained.

/** A status column of the board; its name starts with the status label. */
function column(page: Page, label: string) {
  return page.getByRole("region", { name: new RegExp(`^${label}, \\d+ `) });
}

function card(page: Page, label: string, company: string) {
  return column(page, label)
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: company, exact: true }) });
}

test("cambiar el estado en el tablero con el selector y con el teclado", async ({
  page,
}) => {
  const tag = randomUUID().slice(0, 8);
  const acme = `Acme ${tag}`;
  const globex = `Globex ${tag}`;

  await signInForTest(page);
  await createApplication(page, { company: acme, status: "Enviada" });
  await createApplication(page, { company: globex, status: "Enviada" });

  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link", { name: "Tablero" })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/tablero$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Tablero" }),
  ).toBeVisible();

  await test.step("muestra todas las columnas y las tarjetas en la suya", async () => {
    for (const label of [
      "Enviada",
      "En proceso",
      "Entrevista",
      "Oferta",
      "Descartada",
      "Rechazada por mí",
    ]) {
      await expect(column(page, label)).toBeVisible();
    }
    await expect(card(page, "Enviada", acme)).toBeVisible();
    await expect(card(page, "Enviada", globex)).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  await test.step("el selector mueve la tarjeta y el cambio persiste", async () => {
    await page
      .getByLabel(`Cambiar estado de Desarrollador en ${acme}`)
      .selectOption({ label: "Entrevista" });

    await expect(card(page, "Entrevista", acme)).toBeVisible();
    await expect(card(page, "Enviada", acme)).toHaveCount(0);
    await expect(
      page.getByText(
        `La candidatura de Desarrollador en ${acme} está ahora en Entrevista.`,
      ),
    ).toBeAttached();

    await page.reload();
    await expect(card(page, "Entrevista", acme)).toBeVisible();
    await expect(card(page, "Enviada", acme)).toHaveCount(0);
  });

  await test.step("con el teclado se arrastra a la columna siguiente", async () => {
    const handle = page.getByRole("button", {
      name: `Mover la candidatura de Desarrollador en ${globex}`,
    });
    await handle.focus();
    await page.keyboard.press("Space");
    // The start is announced and, right after, the column it is over.
    await expect(
      page.getByText(
        `La candidatura de Desarrollador en ${globex} está sobre la columna Enviada.`,
      ),
    ).toBeAttached();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByText(
        `La candidatura de Desarrollador en ${globex} está sobre la columna En proceso.`,
      ),
    ).toBeAttached();
    await page.keyboard.press("Space");

    await expect(card(page, "En proceso", globex)).toBeVisible();
    await expect(
      page.getByText(
        `La candidatura de Desarrollador en ${globex} está ahora en En proceso.`,
      ),
    ).toBeAttached();

    await page.reload();
    await expect(card(page, "En proceso", globex)).toBeVisible();
    await expect(card(page, "Enviada", globex)).toHaveCount(0);
    await expectNoHorizontalScroll(page);
  });

  await page.goto("/dashboard");
  await deleteApplication(page, acme);
  await deleteApplication(page, globex);
});
