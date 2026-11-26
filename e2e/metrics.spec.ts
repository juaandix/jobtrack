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

async function openMetrics(page: Page): Promise<void> {
  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link", { name: "Métricas" })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/metricas$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Métricas" }),
  ).toBeVisible();
}

/** The KPI card whose term is `label`. */
function kpi(page: Page, label: string) {
  return page
    .getByRole("region", { name: "Resumen" })
    .locator("div")
    .filter({ has: page.getByText(label, { exact: true }) });
}

test("las métricas muestran los KPI y las tablas de los gráficos", async ({
  page,
}) => {
  const tag = randomUUID().slice(0, 8);
  const acme = `Acme ${tag}`;
  const globex = `Globex ${tag}`;

  const { isNew } = await signInForTest(page);

  // A configured test user may already have applications.
  if (isNew) {
    await test.step("sin candidaturas invita a crear la primera", async () => {
      await openMetrics(page);
      await expect(
        page.getByRole("link", { name: "Añadir la primera candidatura" }),
      ).toBeVisible();
      await expect(page.getByRole("table")).toHaveCount(0);
      await page.goto("/dashboard");
    });
  }

  await createApplication(page, { company: acme, status: "Enviada" });
  await createApplication(page, { company: globex, status: "Entrevista" });
  await openMetrics(page);

  await test.step("tarjetas de KPI", async () => {
    for (const label of [
      "Total de candidaturas",
      "Tasa de respuesta",
      "Procesos activos",
      "Ofertas recibidas",
    ]) {
      await expect(kpi(page, label)).toBeVisible();
    }
    await expect(kpi(page, "Tasa de respuesta")).toContainText(/\d+\s%/);
    if (isNew) {
      await expect(kpi(page, "Total de candidaturas")).toContainText("2");
      await expect(kpi(page, "Tasa de respuesta")).toContainText("50 %");
      await expect(kpi(page, "Tasa de respuesta")).toContainText(
        "1 de 2 han pasado de «Enviada»",
      );
      await expect(kpi(page, "Procesos activos")).toContainText("1");
      await expect(kpi(page, "Ofertas recibidas")).toContainText("0");
    }
  });

  await test.step("tabla alternativa del gráfico semanal", async () => {
    const weekly = page.getByRole("table", {
      name: "Datos del gráfico: candidaturas en cada una de las últimas 12 semanas",
    });
    await expect(weekly).toBeVisible();
    // Header row plus one row per week.
    await expect(weekly.getByRole("row")).toHaveCount(13);
    // The applications were created today: they are in the last week.
    const thisWeek = weekly.getByRole("row").last();
    await expect(thisWeek.getByRole("rowheader")).toContainText(/^Semana \d+/);
    if (isNew) {
      await expect(thisWeek.getByRole("cell")).toHaveText("2");
    }
  });

  await test.step("alternativa textual del gráfico por portal", async () => {
    const name = "Datos del gráfico: candidaturas por portal y estado";
    const narrow = (page.viewportSize()?.width ?? 0) < 640;

    if (narrow) {
      // Below `sm`: one card per portal instead of the eight-column table.
      await expect(page.getByRole("table", { name })).toBeHidden();
      const cards = page.getByRole("list", { name });
      await expect(cards).toBeVisible();
      const total = cards
        .getByRole("listitem")
        .filter({ has: page.getByRole("heading", { name: /^Total/ }) });
      await expect(total).toBeVisible();
      if (isNew) {
        await expect(total.getByRole("heading")).toHaveText(
          /Total\s*2 candidaturas/,
        );
        await expect(total.getByRole("term")).toHaveText([
          "Enviada",
          "Entrevista",
        ]);
        await expect(total.getByRole("definition")).toHaveText(["1", "1"]);
      }
      return;
    }

    await expect(page.getByRole("list", { name })).toBeHidden();
    const portals = page.getByRole("table", { name });
    await expect(portals).toBeVisible();
    await expect(
      portals.getByRole("columnheader", { name: "Rechazada por mí" }),
    ).toBeVisible();
    if (isNew) {
      const totals = portals.getByRole("row", { name: /^Total/ });
      await expect(totals.getByRole("cell")).toHaveText([
        "1",
        "0",
        "1",
        "0",
        "0",
        "0",
        "2",
      ]);
    }
  });

  await test.step("los gráficos se dibujan y no hay scroll horizontal", async () => {
    // The charts are aria-hidden (their tables are the text alternative), so
    // there is no role to find them by: Recharts' container class is used.
    const charts = page.locator(".recharts-responsive-container");
    await expect(charts).toHaveCount(2);
    for (const chart of await charts.all()) {
      await expect(chart.locator("svg").first()).toBeVisible();
    }
    await expectNoHorizontalScroll(page);
  });

  await page.goto("/dashboard");
  await deleteApplication(page, acme);
  await deleteApplication(page, globex);
});
