import { expect, test } from "@playwright/test";

/**
 * Saisie de la date de naissance d'un associé : les trois listes déroulantes
 * doivent conserver leur sélection, y compris sur mobile (iOS et Android), après
 * une navigation puis à la soumission.
 */
test("jour, mois et année restent sélectionnés après navigation et soumission", async ({
  page,
}) => {
  await page.goto("/dev/associe-date", { waitUntil: "domcontentloaded" });

  const jour = page.getByLabel("Jour de naissance");
  const mois = page.getByLabel("Mois de naissance");
  const annee = page.getByLabel("Année de naissance");

  await jour.selectOption("14");
  await expect(page.getByRole("alert")).toBeVisible();
  await mois.selectOption("7");
  await annee.selectOption("1985");

  await expect(jour).toHaveValue("14");
  await expect(mois).toHaveValue("7");
  await expect(annee).toHaveValue("1985");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByTestId("valeur-courante")).toHaveText("1985-07-14");

  // Navigation : le formulaire est démonté puis remonté.
  await page.getByRole("button", { name: "Simuler une navigation" }).click();
  await page.getByRole("button", { name: "Simuler une navigation" }).click();

  await expect(page.getByLabel("Jour de naissance")).toHaveValue("14");
  await expect(page.getByLabel("Mois de naissance")).toHaveValue("7");
  await expect(page.getByLabel("Année de naissance")).toHaveValue("1985");

  await page.getByRole("button", { name: "Soumettre" }).click();
  await expect(page.getByTestId("valeur-soumise")).toHaveText("1985-07-14");
});

test("une date incomplète bloque la soumission", async ({ page }) => {
  await page.goto("/dev/associe-date", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Mois de naissance").selectOption("3");
  await expect(page.getByRole("button", { name: "Soumettre" })).toBeDisabled();
  await expect(page.getByRole("alert")).toBeVisible();
});
