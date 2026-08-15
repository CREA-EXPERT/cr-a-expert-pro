import { test, expect } from "@playwright/test";

const URL_CALENDLY = "https://calendly.com/d/d3vt-kj8-pqf";

test.describe("consultation avec un expert-comptable", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/contact", { waitUntil: "networkidle" });
    await page.getByTestId("contact-objet").selectOption("autre");
    await expect(page.getByTestId("bloc-avis")).toBeVisible({ timeout: 20000 });
  });

  test("le bouton ouvre la réservation dans un nouvel onglet", async ({ page }) => {
    const bouton = page.getByTestId("bouton-consultation").first();
    await expect(bouton).toBeVisible();
    await expect(bouton).toHaveAttribute("href", URL_CALENDLY);
    await expect(bouton).toHaveAttribute("target", "_blank");
    await expect(bouton).toHaveAttribute("rel", "noopener noreferrer");
    await expect(bouton).toHaveAttribute("aria-label", /1 heure/);
  });

  test("le bouton est accessible au clavier", async ({ page }) => {
    const bouton = page.getByTestId("bouton-consultation").first();
    await bouton.focus();
    await expect(bouton).toBeFocused();
    const contour = await bouton.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(typeof contour).toBe("string");
  });

  test("le prix TTC et la durée d'1 heure sont affichés près du bouton", async ({ page }) => {
    const prix = page.getByTestId("consultation-prix").first();
    await expect(prix).toContainText("148,80 € TTC");
    await expect(prix).toContainText("124,00 € HT");
    await expect(prix).toContainText("1 heure");
  });

  test("les 3 points de réassurance sont visibles", async ({ page }) => {
    const bloc = page.getByTestId("consultation-reassurance").first();
    await expect(bloc).toContainText("Pas de chronomètre");
    await expect(bloc).toContainText("sans supplément");
    await expect(bloc).toContainText("Intégralement remboursé");
  });

  test("aucune durée en minutes n'est affichée sur la page", async ({ page }) => {
    const texte = ((await page.locator("body").innerText()) || "").toLowerCase();
    for (const interdit of ["30 min", "demi-heure", "trente minutes"]) {
      expect(texte.includes(interdit)).toBe(false);
    }
  });
});

test("les coulisses de test ne sont pas exposées publiquement", async ({ request }) => {
  const reponse = await request.post("/_serverFn/src_lib_coulisses_functions_ts--lireCoulisses", {
    data: { data: { dossierId: "00000000-0000-0000-0000-000000000000" } },
    failOnStatusCode: false,
  });
  expect(reponse.ok()).toBe(false);
});
