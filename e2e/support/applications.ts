import { expect, type Page } from "@playwright/test";

/** Only the visible match: the list renders cards (< md) or a table (≥ md). */
export function visible(page: Page, name: string) {
  return page.getByText(name, { exact: true }).filter({ visible: true });
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Creates an application from the list page (position "Desarrollador"). */
export async function createApplication(
  page: Page,
  { company, status }: { company: string; status: string },
): Promise<void> {
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

/** Deletes an application created by `createApplication` from the list. */
export async function deleteApplication(
  page: Page,
  company: string,
): Promise<void> {
  await page
    .getByRole("button", {
      name: `Borrar la candidatura de Desarrollador en ${company}`,
    })
    .filter({ visible: true })
    .click();
  await page.getByRole("button", { name: "Sí, borrar" }).click();
  await expect(visible(page, company)).toHaveCount(0);
}
