import { expect, test, type Page } from "@playwright/test";
import {
  expectNoHorizontalScroll,
  field,
  visible,
} from "../support/applications";
import { uniqueCredentials } from "../support/auth";

/*
 * `npm run screenshots`: one image per main view and width (the project name,
 * 1280 or 375) in docs/screenshots/. Needs the local Supabase running and its
 * URL and public key in .env.local. Each run signs up a brand-new user and
 * creates the same applications (dates relative to today, so the weekly
 * chart always has data), then deletes them.
 */

const DIR = "docs/screenshots";

type Sample = {
  company: string;
  position: string;
  status: string;
  portal: string;
  daysAgo: number;
};

const SAMPLES: readonly Sample[] = [
  {
    company: "Acme",
    position: "Desarrolladora frontend",
    status: "Entrevista",
    portal: "LinkedIn",
    daysAgo: 2,
  },
  {
    company: "Globex",
    position: "Ingeniero de datos",
    status: "En proceso",
    portal: "InfoJobs",
    daysAgo: 6,
  },
  {
    company: "Initech",
    position: "Desarrollador full stack",
    status: "Enviada",
    portal: "Web de la empresa",
    daysAgo: 1,
  },
  {
    company: "Hooli",
    position: "Ingeniera de plataforma",
    status: "Enviada",
    portal: "LinkedIn",
    daysAgo: 9,
  },
  {
    company: "Umbrella",
    position: "QA automation",
    status: "Descartada",
    portal: "Indeed",
    daysAgo: 20,
  },
  {
    company: "Stark Industries",
    position: "Tech lead",
    status: "Oferta",
    portal: "Referido",
    daysAgo: 34,
  },
  {
    company: "Wayne Enterprises",
    position: "Backend Node.js",
    status: "Rechazada por mí",
    portal: "Tecnoempleo",
    daysAgo: 48,
  },
];

/** `YYYY-MM-DD` of `daysAgo` days before today in Spain. */
function isoDaysAgo(daysAgo: number): string {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(
    date,
  );
}

/** Hides the random e-mail of the test user (it changes on every run). */
const HIDE_EMAIL =
  'nav[aria-label="Principal"] span.truncate { visibility: hidden; }';

async function capture(page: Page, view: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await expectNoHorizontalScroll(page);
  await page.screenshot({
    path: `${DIR}/${view}-${test.info().project.name}.png`,
    fullPage: true,
    animations: "disabled",
    caret: "hide",
    style: HIDE_EMAIL,
  });
}

async function fillApplication(page: Page, sample: Sample): Promise<void> {
  await field(page, "Empresa").fill(sample.company);
  await field(page, "Puesto").fill(sample.position);
  await field(page, "Estado").selectOption({ label: sample.status });
  await field(page, "Portal").selectOption({ label: sample.portal });
  await field(page, "Fecha de la candidatura").fill(isoDaysAgo(sample.daysAgo));
}

test("capturas de las vistas principales", async ({ page }) => {
  await test.step("login", async () => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { level: 1, name: "Iniciar sesión" }),
    ).toBeVisible();
    await capture(page, "login");
  });

  await test.step("registro de un usuario nuevo", async () => {
    const { email, password } = uniqueCredentials();
    await page.goto("/registro");
    await page.getByLabel("Email").fill(email);
    await field(page, "Contraseña").fill(password);
    await page.getByLabel("Repite la contraseña").fill(password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  await test.step("formulario", async () => {
    const [first, ...rest] = SAMPLES;
    if (first === undefined) throw new Error("sin datos de ejemplo");
    await page.getByRole("link", { name: "Nueva candidatura" }).click();
    await fillApplication(page, first);
    await page
      .getByLabel(/Enlace a la oferta/)
      .filter({ visible: true })
      .fill("https://empleo.example/ofertas/frontend");
    await page
      .getByLabel(/Salario mínimo/)
      .filter({ visible: true })
      .fill("38000");
    await page
      .getByLabel(/Salario máximo/)
      .filter({ visible: true })
      .fill("45000");
    await page
      .getByLabel(/Notas/)
      .filter({ visible: true })
      .fill("Segunda entrevista técnica el jueves.");
    await capture(page, "formulario");
    await page.getByRole("button", { name: "Guardar candidatura" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    for (const sample of rest) {
      await page.getByRole("link", { name: "Nueva candidatura" }).click();
      await fillApplication(page, sample);
      await page.getByRole("button", { name: "Guardar candidatura" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(visible(page, sample.company)).toBeVisible();
    }
  });

  await test.step("lista", async () => {
    await expect(page.getByRole("status")).toHaveText(
      `${SAMPLES.length} candidaturas`,
    );
    await capture(page, "lista");
  });

  await test.step("tablero", async () => {
    await page.goto("/dashboard/tablero");
    await expect(
      page.getByRole("region", { name: /^Oferta, 1 candidatura$/ }),
    ).toBeVisible();
    await capture(page, "tablero");
  });

  await test.step("métricas", async () => {
    await page.goto("/dashboard/metricas");
    const charts = page.locator(".recharts-responsive-container");
    await expect(charts).toHaveCount(2);
    for (const chart of await charts.all()) {
      await expect(chart.locator("svg").first()).toBeVisible();
    }
    await capture(page, "metricas");
  });

  await test.step("limpieza", async () => {
    await page.goto("/dashboard");
    for (const { company, position } of SAMPLES) {
      await page
        .getByRole("button", {
          name: `Borrar la candidatura de ${position} en ${company}`,
        })
        .filter({ visible: true })
        .click();
      await page.getByRole("button", { name: "Sí, borrar" }).click();
      await expect(visible(page, company)).toHaveCount(0);
    }
  });
});
