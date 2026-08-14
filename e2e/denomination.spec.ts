import { expect, test } from "@playwright/test";

/**
 * Vérification de la dénomination : information de risque, jamais un blocage.
 * L'annuaire public est simulé pour rendre le test déterministe.
 */
test("homonyme de même activité : avertissement renforcé, sans blocage", async ({ page }) => {
  await page.route("**recherche-entreprises.api.gouv.fr/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        results: [
          {
            nom_raison_sociale: "ESSAI CONSEIL",
            siren: "123456789",
            activite_principale: "70.22Z",
            libelle_activite_principale: "Conseil pour les affaires",
            siege: { libelle_commune: "Lyon" },
          },
        ],
      }),
    }),
  );

  await page.goto("/dev/denomination", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main[data-hydrated='1']")).toBeVisible({ timeout: 30_000 });

  const bloc = page.getByTestId("verif-denomination");
  await bloc.getByRole("button", { name: "Rechercher ce nom" }).click();

  const alerte = page.getByTestId("risque-proche");
  await expect(alerte).toBeVisible({ timeout: 15_000 });
  await expect(alerte).toContainText("Le greffe ne refusera pas votre immatriculation");

  // Lien INPI présent et ouvert dans un nouvel onglet.
  const lien = bloc.getByRole("link", { name: /Rechercher une marque déposée/ });
  await expect(lien).toHaveAttribute("target", "_blank");
  await expect(bloc).toContainText("Recherche gratuite.");

  // La génération des statuts n'est jamais bloquée pour un motif de dénomination.
  await expect(page.getByRole("button", { name: "Générer les statuts" })).toBeEnabled();

  // Encadré pédagogique repliable.
  const encadre = page.getByRole("button", { name: "Un nom déjà utilisé est-il interdit ?" });
  await expect(encadre).toHaveAttribute("aria-expanded", "false");
  await encadre.click();
  await expect(encadre).toHaveAttribute("aria-expanded", "true");
  await expect(bloc.getByText(/L\. 210-2 du code de commerce/)).toBeVisible();
});
