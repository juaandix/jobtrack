import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  createApplication,
  deleteApplication,
  expectNoHorizontalScroll,
  visible,
} from "./support/applications";
import { signInForTest } from "./support/auth";

// Needs the local Supabase running (`npm run db:start`) and its URL and public
// key in .env.local. See e2e/support/auth.ts for how the user is obtained.

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
  const company = `Acme ${randomUUID().slice(0, 8)}`;

  await signInForTest(page);
  await createApplication(page, { company, status: "Oferta" });

  await page.goto("/dashboard?status=contratada&status=oferta&portal=nada");

  const search = page.getByRole("search", { name: "Filtrar candidaturas" });
  await expect(search.getByLabel("Filtrar por estado")).toHaveValue("");
  await expect(search.getByLabel("Filtrar por portal")).toHaveValue("");
  await expect(page.getByRole("status")).toHaveText(/^\d+ candidaturas?$/);
  await expect(visible(page, company)).toBeVisible();

  await page.goto("/dashboard");
  await deleteApplication(page, company);
});

test("sin JavaScript, la URL del GET nativo del formulario filtra en el servidor", async ({
  page,
  browser,
}) => {
  const tag = randomUUID().slice(0, 8);
  const acme = `Acme ${tag}`;
  const globex = `Globex ${tag}`;

  await signInForTest(page);
  await createApplication(page, { company: acme, status: "Entrevista" });
  await createApplication(page, { company: globex, status: "Enviada" });

  // Same session and screen as this project, with JavaScript turned off.
  const { baseURL, viewport } = test.info().project.use;
  const noScript = await browser.newContext({
    baseURL,
    viewport,
    javaScriptEnabled: false,
    storageState: await page.context().storageState(),
  });
  try {
    const plain = await noScript.newPage();
    await plain.goto("/dashboard");

    /*
     * The private pages are streamed (Suspense + cacheComponents): without
     * JavaScript the streamed HTML arrives but React cannot reveal it, so
     * the form cannot be clicked. Its markup is read instead and the URL a
     * browser submits for it (every field, empty ones included) is built
     * from it: what is checked is that the server filters that native GET.
     */
    const form = plain.getByRole("search", {
      name: "Filtrar candidaturas",
      includeHidden: true,
    });
    await expect(form).toHaveAttribute("method", "get");
    const action = await form.getAttribute("action");
    const names: string[] = [];
    for (const field of await form.locator("input[name], select[name]").all()) {
      names.push((await field.getAttribute("name")) ?? "");
    }
    expect(action).toBe("/dashboard");
    expect(names).toEqual(["q", "status", "portal"]);
    const values: Record<string, string> = {
      q: tag,
      status: "entrevista",
      portal: "",
    };
    const query = new URLSearchParams(
      names.map((name): [string, string] => [name, values[name] ?? ""]),
    );

    await plain.goto(`${action}?${query.toString()}`);

    await expect(plain).toHaveURL(
      new RegExp(`/dashboard\\?q=${tag}&status=entrevista&portal=$`),
    );
    await expect(plain.getByText(acme, { exact: true })).not.toHaveCount(0);
    await expect(plain.getByText(globex, { exact: true })).toHaveCount(0);
    await expect(form.getByLabel("Buscar por empresa")).toHaveValue(tag);
    await expect(form.getByLabel("Filtrar por estado")).toHaveValue(
      "entrevista",
    );
  } finally {
    await noScript.close();
  }

  await deleteApplication(page, acme);
  await deleteApplication(page, globex);
});
