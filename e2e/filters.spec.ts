import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { signInForTest } from "./support/auth";

// Needs the local Supabase running (`npm run db:start`) and its URL and public
// key in .env.local. See e2e/support/auth.ts for how the user is obtained.

/** Only the visible match: the list renders cards (< md) or a table (≥ md). */
function visible(page: Page, name: string) {
  return page.getByText(name, { exact: true }).filter({ visible: true });
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function createApplication(
  page: Page,
  { company, status }: { company: string; status: string },
) {
  await page.getByRole("link", { name: "Nueva candidatura" }).click();
  await page.getByLabel("Empresa", { exact: true }).fill(company);
  await page.getByLabel("Puesto", { exact: true }).fill("Desarrollador");
  await page
    .getByLabel("Estado", { exact: true })
    .selectOption({ label: status });
  await page.getByRole("button", { name: "Guardar candidatura" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(visible(page, company)).toBeVisible();
}

async function deleteApplication(page: Page, company: string) {
  await page
    .getByRole("button", {
      name: `Borrar la candidatura de Desarrollador en ${company}`,
    })
    .filter({ visible: true })
    .click();
  await page.getByRole("button", { name: "Sí, borrar" }).click();
  await expect(visible(page, company)).toHaveCount(0);
}

test("filtrar por texto y estado, recargar y limpiar los filtros", async ({
  page,
}) => {
  // A unique tag keeps the results independent of other applications.
  const tag = randomUUID().slice(0, 8);
  const telefonica = `Telefónica ${tag}`;
  const nandu = `ÑANDÚ ${tag}`;

  await signInForTest(page);
  await createApplication(page, { company: telefonica, status: "Entrevista" });
  await createApplication(page, { company: nandu, status: "Enviada" });

  const search = page.getByRole("search", { name: "Filtrar candidaturas" });
  const query = search.getByLabel("Buscar por empresa");
  const status = search.getByLabel("Filtrar por estado");
  const results = page.getByRole("status");

  await test.step("el texto ignora mayúsculas y tildes", async () => {
    await query.fill(`  TELEFONICA ${tag}  `);
    await search.getByRole("button", { name: "Filtrar" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/dashboard\\?q=TELEFONICA\\+${tag}$`),
    );
    await expect(visible(page, telefonica)).toBeVisible();
    await expect(visible(page, nandu)).toHaveCount(0);
    await expect(results).toHaveText(/^1 de \d+ candidaturas$/);

    await query.fill(`nandu ${tag}`);
    await query.press("Enter");

    await expect(visible(page, nandu)).toBeVisible();
    await expect(visible(page, telefonica)).toHaveCount(0);
  });

  await test.step("combina texto y estado", async () => {
    await query.fill(tag);
    await status.selectOption({ label: "Entrevista" });
    await search.getByRole("button", { name: "Filtrar" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/dashboard\\?status=entrevista&q=${tag}$`),
    );
    await expect(visible(page, telefonica)).toBeVisible();
    await expect(visible(page, nandu)).toHaveCount(0);
    await expectNoHorizontalScroll(page);
  });

  await test.step("el filtro sobrevive a recargar la página", async () => {
    await page.reload();

    await expect(query).toHaveValue(tag);
    await expect(status).toHaveValue("entrevista");
    await expect(visible(page, telefonica)).toBeVisible();
    await expect(visible(page, nandu)).toHaveCount(0);
    await expect(results).toHaveText(/^1 de \d+ candidaturas$/);
  });

  await test.step("sin resultados ofrece volver a la lista", async () => {
    await status.selectOption({ label: "Oferta" });
    await search.getByRole("button", { name: "Filtrar" }).click();

    await expect(
      page.getByText("Ninguna candidatura coincide con estos filtros."),
    ).toBeVisible();
    await expect(results).toHaveText(/^0 de \d+ candidaturas$/);
    await expectNoHorizontalScroll(page);
  });

  await test.step("limpiar quita todos los filtros", async () => {
    await search.getByRole("link", { name: "Limpiar filtros" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(query).toHaveValue("");
    await expect(status).toHaveValue("");
    await expect(visible(page, telefonica)).toBeVisible();
    await expect(visible(page, nandu)).toBeVisible();
    await expect(
      search.getByRole("link", { name: "Limpiar filtros" }),
    ).toHaveCount(0);
  });

  await deleteApplication(page, telefonica);
  await deleteApplication(page, nandu);
});

test("valores de filtro inválidos en la URL se ignoran", async ({ page }) => {
  const { isNew } = await signInForTest(page);
  if (isNew) {
    await createApplication(page, {
      company: `Acme ${randomUUID().slice(0, 8)}`,
      status: "Oferta",
    });
  }

  await page.goto("/dashboard?status=contratada&status=oferta&portal=nada");

  const search = page.getByRole("search", { name: "Filtrar candidaturas" });
  await expect(search.getByLabel("Filtrar por estado")).toHaveValue("");
  await expect(search.getByLabel("Filtrar por portal")).toHaveValue("");
  await expect(page.getByRole("status")).toHaveText(/^\d+ candidaturas?$/);
});
