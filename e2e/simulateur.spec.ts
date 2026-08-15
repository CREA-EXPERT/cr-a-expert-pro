import { test, expect, devices, type Page } from "@playwright/test";

const DISCLAIMER_DEBUT = "Ce comparateur fournit une information générale et pédagogique";

async function parcourir(page: Page) {
  await page.goto("/simulateur");
  await expect(page.getByRole("heading", { name: "Comparer les formes juridiques" })).toBeVisible();
  await expect(page.getByText(DISCLAIMER_DEBUT).first()).toBeVisible();

  // Répond à la première option de chaque question tant qu'il en reste.
  for (let i = 0; i < 30; i++) {
    const formulaire = page.getByRole("heading", { name: "Recevoir votre comparatif" });
    if (await formulaire.isVisible().catch(() => false)) break;
    const options = page.locator("button", { hasText: /.+/ });
    const cible = page.locator("div.grid > button").first();
    if (!(await cible.isVisible().catch(() => false))) break;
    await cible.click();
    await options.first().waitFor({ state: "attached" });
  }

  await expect(page.getByRole("heading", { name: "Recevoir votre comparatif" })).toBeVisible();
  await page.getByLabel("Adresse électronique").fill("e2e@example.com");
  await page.locator("#sim-consent").click();
  await page.getByRole("button", { name: "Afficher mon comparatif" }).click();

  await expect(page.getByRole("table")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(DISCLAIMER_DEBUT).first()).toBeVisible();
  await expect(page.getByText("Textes v")).toBeVisible();
}

test("comparateur — parcours complet (desktop)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await parcourir(page);
});

test("comparateur — parcours complet (mobile)", async ({ browser }) => {
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  await parcourir(page);
  await context.close();
});

test("l'ancien libellé « Aidez-moi à choisir » a disparu", async ({ page }) => {
  for (const url of ["/", "/commencer", "/simulateur", "/tarifs"]) {
    await page.goto(url);
    await expect(page.locator("body")).not.toContainText("Aidez-moi à choisir");
  }
  await page.goto("/commencer");
  await expect(page.getByRole("heading", { name: "Comparer les formes juridiques" })).toBeVisible();
});
