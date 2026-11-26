import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalScroll,
  field,
  visible,
} from "./support/applications";
import { signInForTest } from "./support/auth";

// Needs the local Supabase running (`npm run db:start`) and its URL and public
// key in .env.local. See e2e/support/auth.ts for how the user is obtained.

test("crear, editar y borrar una candidatura", async ({ page }) => {
  const company = `Acme ${randomUUID().slice(0, 8)}`;
  const position = "Desarrollador frontend";

  const { isNew } = await signInForTest(page);

  // A configured test user may already have applications.
  if (isNew) {
    await test.step("la lista vacía invita a crear la primera", async () => {
      await expect(
        page.getByText(/Todavía no tienes candidaturas/),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Añadir la primera candidatura" }),
      ).toBeVisible();
    });
  }

  await test.step("crea una candidatura tras corregir un error", async () => {
    await page.getByRole("link", { name: "Nueva candidatura" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Nueva candidatura" }),
    ).toBeVisible();
    await expect(field(page, "Fecha de la candidatura")).toHaveValue(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    await expectNoHorizontalScroll(page);

    await field(page, "Empresa").fill(company);
    await field(page, "Puesto").fill(position);
    await field(page, "Portal").selectOption({ label: "LinkedIn" });
    await page
      .getByLabel(/Salario mínimo/)
      .filter({ visible: true })
      .fill("50000");
    await page
      .getByLabel(/Salario máximo/)
      .filter({ visible: true })
      .fill("40000");
    await page.getByRole("button", { name: "Guardar candidatura" }).click();

    const salaryMax = page
      .getByLabel(/Salario máximo/)
      .filter({ visible: true });
    await expect(salaryMax).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText("El salario máximo no puede ser menor que el mínimo"),
    ).toBeVisible();
    await expect(field(page, "Empresa")).toHaveValue(company);

    await salaryMax.fill("60000");
    await page.getByRole("button", { name: "Guardar candidatura" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(visible(page, company)).toBeVisible();
    await expect(visible(page, position)).toBeVisible();
    await expect(visible(page, "Enviada")).toBeVisible();
    await expect(visible(page, "LinkedIn")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  await test.step("edita el estado de la candidatura", async () => {
    await page
      .getByRole("link", {
        name: `Editar la candidatura de ${position} en ${company}`,
      })
      .filter({ visible: true })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Editar candidatura" }),
    ).toBeVisible();
    await expect(field(page, "Empresa")).toHaveValue(company);
    await expect(
      page.getByLabel(/Salario máximo/).filter({ visible: true }),
    ).toHaveValue("60000");

    await field(page, "Estado").selectOption({ label: "Entrevista" });
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(visible(page, "Entrevista")).toBeVisible();
  });

  await test.step("borra la candidatura tras confirmar", async () => {
    const deleteButton = page
      .getByRole("button", {
        name: `Borrar la candidatura de ${position} en ${company}`,
      })
      .filter({ visible: true });
    const dialog = page.getByRole("dialog", {
      name: "¿Borrar la candidatura?",
    });

    await deleteButton.click();
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Cancelar" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(deleteButton).toBeFocused();
    await expect(visible(page, company)).toBeVisible();

    await deleteButton.click();
    await dialog.getByRole("button", { name: "Sí, borrar" }).click();

    await expect(visible(page, company)).toHaveCount(0);
    // The row is gone: the deletion is announced and the focus goes to the
    // page heading instead of being lost.
    await expect(
      page.getByText(`Candidatura borrada: ${position} en ${company}.`),
    ).toBeAttached();
    await expect(
      page.getByRole("heading", { level: 1, name: "Mis candidaturas" }),
    ).toBeFocused();
  });
});

test("editar una candidatura inexistente muestra 'no encontrada'", async ({
  page,
}) => {
  await signInForTest(page);

  await page.goto(`/dashboard/candidaturas/${randomUUID()}/editar`);

  await expect(
    page.getByRole("heading", { level: 1, name: "Candidatura no encontrada" }),
  ).toBeVisible();
});
