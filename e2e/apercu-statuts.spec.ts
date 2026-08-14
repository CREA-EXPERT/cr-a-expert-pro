import { expect, test } from "@playwright/test";

/**
 * Aperçu du projet de statuts : blocage tant que des informations manquent,
 * reprise automatique de la génération une fois le dossier complet, et journal
 * de conformité horodaté. Exécuté sur mobile (iOS, Android) et bureau.
 */
test("blocage détaillé, reprise automatique et journal de conformité", async ({ page }) => {
  await page.goto("/dev/apercu-statuts", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main[data-hydrated='1']")).toBeVisible({ timeout: 30_000 });

  const apercu = page.getByTestId("apercu-statuts");
  await expect(apercu).toBeVisible();

  // Dossier incomplet : génération impossible et motifs affichés avec l'étape.
  await expect(page.getByRole("button", { name: "Afficher l'aperçu" })).toBeDisabled();
  await expect(apercu.getByText("Informations juridiques manquantes")).toBeVisible();
  await expect(apercu.getByText("Dénomination sociale")).toBeVisible();
  await expect(apercu.getByText("étape « Dénomination »")).toBeVisible();
  await expect(
    apercu.getByText("L'aperçu sera disponible dès que les points ci-dessus seront traités."),
  ).toBeVisible();

  // Journal de conformité : présent, replié par défaut, dépliable.
  const journal = page.getByRole("button", { name: "Journal de conformité" });
  await expect(journal).toBeVisible();
  await expect(journal).toHaveAttribute("aria-expanded", "false");

  // Complétion des champs : l'aperçu se régénère sans clic.
  await page.getByRole("button", { name: "Compléter le dossier" }).click();
  await expect(apercu.getByText("Informations juridiques manquantes")).toHaveCount(0);
  await expect(page.locator("object[aria-label=\"Aperçu du projet de statuts\"]")).toBeVisible({
    timeout: 30_000,
  });

  // Pas de débordement horizontal de la mise en page.
  const debordement = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(debordement).toBeLessThanOrEqual(1);

  // Le journal liste le blocage puis la génération réussie, horodatés.
  await journal.click();
  await expect(journal).toHaveAttribute("aria-expanded", "true");
  await expect(apercu.getByText(/Génération des statuts bloquée/)).toBeVisible();
  await expect(apercu.getByText(/Projet de statuts généré/)).toBeVisible();
  await expect(apercu.getByText(/\d{4} à \d{2}:\d{2}/).first()).toBeVisible();
});
