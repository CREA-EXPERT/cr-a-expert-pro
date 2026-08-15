import { test, expect } from "@playwright/test";

/**
 * Parcours de test de bout en bout, avec interception d'envoi.
 *
 * Inscription d'un compte `+test` horodaté, confirmation d'email automatisée
 * via la boîte de test (aucune intervention manuelle), connexion, puis
 * ouverture du parcours de création jusqu'à l'écran de transmission. Les
 * emails d'étape sont relus dans la boîte de test, par étiquette et par ordre
 * d'arrivée. Le parcours réel n'est pas modifié : ce scénario ne s'exécute que
 * lorsque `EMAILS_TEST_INTERCEPT=1`.
 */
const INTERCEPTION_ACTIVE = process.env["EMAILS_TEST_INTERCEPT"] === "1";
const CLE = process.env["EMAILS_TEST_INTERCEPT_KEY"];
const entetes = CLE ? { "x-test-inbox-key": CLE } : undefined;

const MOT_DE_PASSE = "MotDePasseTest!2026";

test.describe("Parcours du mode test", () => {
  test.skip(!INTERCEPTION_ACTIVE, "Nécessite un serveur démarré avec EMAILS_TEST_INTERCEPT=1.");
  test.setTimeout(180_000);

  test("inscription, confirmation automatisée, connexion et ouverture du dossier", async ({
    page,
    request,
  }) => {
    const email = `recette+test-${Date.now()}@crea-expert.fr`;

    // 1. Inscription
    await page.goto("/auth");
    await page.getByLabel("Prénom").fill("Recette");
    await page.getByLabel("Nom", { exact: true }).fill("Automatisée");
    await page.getByLabel("Adresse électronique").first().fill(email);
    await page.getByLabel("Mot de passe").first().fill(MOT_DE_PASSE);
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await page.waitForTimeout(2000);

    // 2. Confirmation d'email automatisée (aucune boîte réelle n'est consultée)
    const confirmation = await request.post("/api/public/emails-test/confirmer", {
      headers: entetes,
      data: { email, sansEmail: true },
    });
    expect(confirmation.status(), "le compte de test doit être confirmé").toBe(200);

    // 3. Connexion
    await page.goto("/auth");
    await page.getByRole("tab", { name: "Se connecter" }).click();
    await page.getByLabel("Adresse électronique").last().fill(email);
    await page.getByLabel("Mot de passe").last().fill(MOT_DE_PASSE);
    await page.getByRole("button", { name: /Se connecter/ }).click();
    await page.waitForURL(/tableau-de-bord|creation/, { timeout: 30_000 });

    // 4. Ouverture du parcours de création
    await page.goto("/creation");
    await expect(page.locator("body")).toContainText(/création|dossier/i);

    // 5. Boîte de test : aucun envoi réel, ordre d'arrivée respecté
    const boite = await request.get(
      `/api/public/emails-test?destinataire=${encodeURIComponent(email)}`,
      { headers: entetes },
    );
    expect(boite.ok()).toBeTruthy();
    const { emails } = (await boite.json()) as {
      emails: Array<{ ordre: number; tag: string; sujet: string }>;
    };
    const ordres = emails.map((e) => e.ordre);
    expect([...ordres].sort((a, b) => a - b)).toEqual(ordres);
    const indexOuvert = emails.findIndex((e) => e.tag === "dossier_ouvert");
    const indexTransmis = emails.findIndex((e) => e.tag === "dossier_transmis");
    if (indexOuvert >= 0 && indexTransmis >= 0) {
      expect(indexOuvert, "l'accusé d'ouverture précède la transmission").toBeLessThan(
        indexTransmis,
      );
    }
  });
});
