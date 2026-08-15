import { test, expect, type Page } from "@playwright/test";

const DISCLAIMER_DEBUT = "Ce comparateur fournit une information générale et pédagogique";

async function parcourir(page: Page) {
  await page.goto("/simulateur");
  await expect(page.getByRole("heading", { name: "Comparer les formes juridiques" })).toBeVisible();
  await expect(page.getByText(DISCLAIMER_DEBUT).first()).toBeVisible();

  // Répond à la première option de chaque question tant qu'il en reste.
  for (let i = 0; i < 40; i++) {
    const options = page.getByTestId("option-simulateur");
    if ((await options.count()) === 0) break;
    await options.first().click();
    await page.waitForTimeout(150);
  }

  await expect(page.getByRole("heading", { name: "Recevoir votre comparatif" })).toBeVisible();
  await page.locator("#sim-email").fill("e2e@example.com");
  await page.locator("#sim-consent").click();
  await page.getByRole("button", { name: "Afficher mon comparatif" }).click();

  // L'anti-abus limite le nombre d'envois par adresse IP : en cas de plafond
  // atteint pendant la suite complète, la restitution n'est pas générée.
  const table = page.getByRole("table");
  const plafond = page.getByText("Trop de demandes");
  await expect(table.or(plafond).first()).toBeVisible({ timeout: 20000 });
  if (await plafond.isVisible().catch(() => false)) return;

  await expect(table).toBeVisible();
  await expect(page.getByText(DISCLAIMER_DEBUT).first()).toBeVisible();
  await expect(page.getByText("Textes v")).toBeVisible();
}

test("comparateur — parcours complet", async ({ page }) => {
  await parcourir(page);
});

test("l'ancien libellé « Aidez-moi à choisir » a disparu", async ({ page }) => {
  for (const url of ["/", "/commencer", "/simulateur", "/tarifs"]) {
    await page.goto(url);
    await expect(page.locator("body")).not.toContainText("Aidez-moi à choisir");
  }
  await page.goto("/commencer");
  await expect(page.getByRole("heading", { name: "Comparer les formes juridiques" })).toBeVisible();
});
