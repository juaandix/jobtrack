import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  createApplication,
  deleteApplication,
  visible,
} from "../support/applications";
import { signIn, type Credentials } from "../support/auth";

/*
 * `npm run e2e:prod`: login → create an application → see it in the list →
 * delete it, against the deployed app (see playwright.prod.config.ts). The
 * application has a unique company name and is deleted in `afterEach` too,
 * so a failure halfway does not leave data behind in production.
 */

/** E2E_PROD_USER_EMAIL/E2E_PROD_USER_PASSWORD, checked by the config. */
function productionCredentials(): Credentials {
  const email = process.env.E2E_PROD_USER_EMAIL?.trim();
  const password = process.env.E2E_PROD_USER_PASSWORD;
  if (!email || !password) {
    throw new Error("Faltan E2E_PROD_USER_EMAIL/E2E_PROD_USER_PASSWORD.");
  }
  return { email, password };
}

let createdCompany: string | null = null;

test.afterEach(async ({ page }) => {
  const company = createdCompany;
  createdCompany = null;
  if (company === null) {
    return;
  }
  await page.goto(`/dashboard?q=${encodeURIComponent(company)}`);
  // The list streams in after the heading: wait until it shows either the
  // application or one of the empty states before deciding.
  const row = visible(page, company);
  await expect(
    row.or(
      page.getByText(
        /Ninguna candidatura coincide con estos filtros|Todavía no tienes candidaturas/,
      ),
    ),
  ).toBeVisible();
  if ((await row.count()) > 0) {
    await deleteApplication(page, company);
  }
});

test("smoke: iniciar sesión, crear, ver y borrar una candidatura", async ({
  page,
}) => {
  const credentials = productionCredentials();
  const company = `Smoke e2e ${randomUUID().slice(0, 8)}`;

  await test.step("inicia sesión con el usuario de prueba", async () => {
    await signIn(page, credentials);
  });

  await test.step("crea la candidatura y la ve en la lista", async () => {
    // From here on the application may exist: afterEach cleans it up.
    createdCompany = company;
    await createApplication(page, { company, status: "Enviada" });
  });

  await test.step("borra la candidatura", async () => {
    await deleteApplication(page, company);
  });
});
