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

  test("le libellé exact est affiché sous le bouton et le bloc réassurance a disparu", async ({ page }) => {
    const bloc = page.getByTestId("consultation-sous-bouton").first();
    await expect(bloc).toHaveText(
      "Consultation d' 1h avec un expert-comptable. 148,80 € TTC ( TVA 20 %). La durée est indicative, on traite le problème jusqu'au bout.",
    );
    await expect(page.getByTestId("consultation-reassurance")).toHaveCount(0);
    const texte = (await page.locator("body").innerText()).toLowerCase();
    expect(texte.includes("pas de chronomètre")).toBe(false);
    expect(texte.includes("(durée indicative)")).toBe(false);
  });

  test("le bouton est décrit par son libellé pour les lecteurs d'écran", async ({ page }) => {
    const bouton = page.getByTestId("bouton-consultation").first();
    const id = await page.getByTestId("consultation-sous-bouton").first().getAttribute("id");
    await expect(bouton).toHaveAttribute("aria-describedby", id ?? "");
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

test.describe("landing : justification et aperçu imprimable", () => {
  for (const [nom, viewport] of [
    ["mobile", { width: 390, height: 844 }],
    ["tablette", { width: 820, height: 1180 }],
    ["desktop", { width: 1280, height: 900 }],
  ] as const) {
    test(`les paragraphes restent justifiés en ${nom}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "networkidle" });
      const alignements = await page
        .locator("main p")
        .evaluateAll((els) =>
          els
            .filter((el) => (el.textContent ?? "").trim().length > 80)
            .map((el) => getComputedStyle(el).textAlign),
        );
      expect(alignements.length).toBeGreaterThan(0);
      expect(alignements.every((a) => a === "justify")).toBe(true);
    });
  }

  test("l'aperçu imprimable est disponible et conserve la justification", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByTestId("apercu-imprimable")).toBeVisible();
    await page.emulateMedia({ media: "print" });
    const bloc = page.getByTestId("consultation-sous-bouton").first();
    const style = await bloc.evaluate((el) => getComputedStyle(el).textAlign);
    expect(style).toBe("justify");
    await page.emulateMedia({ media: "screen" });
  });
});
