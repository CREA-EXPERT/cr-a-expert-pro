import { expect, test } from "@playwright/test";

/**
 * Suivi de conformité : filtres, tri, export CSV, lien de correction depuis un
 * motif de blocage, et fermeture de l'espace cabinet aux comptes non habilités.
 */
test("filtres, tri et export CSV du suivi de conformité", async ({ page }) => {
  await page.goto("/dev/conformite", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main[data-hydrated='1']")).toBeVisible({ timeout: 30_000 });

  const tableau = page.getByTestId("tableau-conformite");
  await expect(tableau.getByText("ALPHA CONSEIL")).toBeVisible();
  await expect(tableau.getByText("BETA IMMOBILIER")).toBeVisible();

  // Recherche libre sur la dénomination.
  await page.getByLabel("Rechercher une dénomination").fill("beta");
  await expect(tableau.getByText("ALPHA CONSEIL")).toHaveCount(0);
  await expect(tableau.getByText("BETA IMMOBILIER")).toBeVisible();
  await page.getByLabel("Rechercher une dénomination").fill("");

  // Filtre par forme juridique puis par statut.
  await page.getByLabel("Forme juridique").selectOption("SCI");
  await expect(tableau.getByText("ALPHA CONSEIL")).toHaveCount(0);
  await page.getByLabel("Forme juridique").selectOption("");
  await page.getByLabel("Statut").selectOption("avec_refus");
  await expect(tableau.getByText("BETA IMMOBILIER")).toHaveCount(0);
  await expect(tableau.getByText("ALPHA CONSEIL")).toBeVisible();
  await page.getByLabel("Statut").selectOption("");

  // Tri par dénomination : ALPHA en premier.
  await page.getByLabel("Trier par").selectOption("denomination");
  const premier = tableau.locator("ul > li").first();
  await expect(premier).toContainText("ALPHA CONSEIL");

  // Export CSV du périmètre affiché.
  const telechargement = page.waitForEvent("download");
  await page.getByTestId("export-csv-conformite").click();
  const fichier = await telechargement;
  expect(fichier.suggestedFilename().length).toBeGreaterThan(0);
});

test("un motif de blocage renvoie vers l'étape à corriger", async ({ page }) => {
  await page.goto("/dev/conformite", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main[data-hydrated='1']")).toBeVisible({ timeout: 30_000 });

  const prioritaire = page.getByTestId("motif-prioritaire");
  await expect(prioritaire).toContainText("Point à corriger en priorité");
  const lien = prioritaire.getByRole("link");
  await expect(lien).toContainText("Dénomination");
  await expect(lien).toHaveAttribute("href", /\/creation\?etape=2/);

  const refus = page.getByTestId("refus-telechargement");
  await expect(refus.getByRole("link")).toHaveCount(2);
});

test("le suivi de conformité n'est pas accessible sans habilitation", async ({ page }) => {
  await page.goto("/cabinet/conformite", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/auth/, { timeout: 30_000 });
  await expect(page).toHaveURL(/\/auth/);
});
