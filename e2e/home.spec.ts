import { expect, test } from "@playwright/test";

test("la home muestra el título y la estructura semántica", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "JobTrack" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});
