import { test, expect } from "@playwright/test";

const URL_CALENDLY = "[URL_CALENDLY]";

test("landing — le bouton de consultation pointe vers la page de réservation", async ({ page }) => {
  await page.goto("/");
  const bouton = page.getByTestId("bouton-consultation").first();
  await expect(bouton).toBeVisible();
  await expect(bouton).toHaveAttribute("href", URL_CALENDLY);
  await expect(bouton).toHaveAttribute("target", "_blank");
});

test("contact — la catégorie « bug » affiche une confirmation après envoi", async ({ page }) => {
  await page.goto("/contact");
  await page.getByTestId("contact-objet").selectOption("bug");
  await page.locator("#contact-email").fill("e2e@example.com");
  await page.locator("#contact-message").fill("Le bouton de validation reste inactif à l'étape 3.");
  await page.getByRole("button", { name: "Envoyer mon message" }).click();

  const confirmation = page.getByTestId("contact-confirmation");
  const plafond = page.getByText("Trop de messages");
  await expect(confirmation.or(plafond).first()).toBeVisible({ timeout: 20000 });
});

test("contact — la catégorie « autre » propose la consultation, sans formulaire", async ({
  page,
}) => {
  await page.goto("/contact");
  await page.getByTestId("contact-objet").selectOption("autre");
  await expect(page.getByTestId("bloc-avis")).toBeVisible();
  await expect(page.getByTestId("bouton-consultation")).toBeVisible();
  await expect(page.getByTestId("contact-formulaire")).toHaveCount(0);
});

test("plus aucun rappel gratuit côté public", async ({ page }) => {
  for (const url of ["/", "/simulateur", "/contact", "/tarifs"]) {
    await page.goto(url);
    await expect(page.getByText("Être rappelé")).toHaveCount(0);
    await expect(page.getByText("rappel gratuit")).toHaveCount(0);
  }
});
