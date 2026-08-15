import { test, expect } from "@playwright/test";

/**
 * Mode test de bout en bout : boîte de réception de test.
 *
 * Le parcours réel n'est jamais modifié par ces tests. Ils vérifient que la
 * boîte de test n'est ouverte que lorsque l'interception d'envoi est activée
 * (`EMAILS_TEST_INTERCEPT=1`) et, dans ce cas, que les emails d'étape sont
 * lisibles par étiquette et par dossier, dans leur ordre d'arrivée.
 */
const INTERCEPTION_ACTIVE = process.env["EMAILS_TEST_INTERCEPT"] === "1";

test.describe("Boîte de réception de test", () => {
  test("l'endpoint est fermé lorsque l'interception est désactivée", async ({ request }) => {
    test.skip(INTERCEPTION_ACTIVE, "Interception activée : l'endpoint est ouvert.");
    const reponse = await request.get("/api/public/emails-test");
    expect(reponse.status()).toBe(403);
  });

  test("les emails interceptés sont lisibles par étiquette et ordonnés", async ({ request }) => {
    test.skip(!INTERCEPTION_ACTIVE, "Nécessite EMAILS_TEST_INTERCEPT=1.");

    const ouverts = await request.get("/api/public/emails-test?tag=dossier_ouvert");
    expect(ouverts.ok()).toBeTruthy();
    const corpsOuverts = (await ouverts.json()) as { emails: Array<{ tag: string; ordre: number }> };
    expect(corpsOuverts.emails.length).toBeGreaterThan(0);
    expect(corpsOuverts.emails.every((e) => e.tag === "dossier_ouvert")).toBeTruthy();

    const tous = await request.get("/api/public/emails-test");
    const corpsTous = (await tous.json()) as { emails: Array<{ ordre: number; sujet: string }> };
    const ordres = corpsTous.emails.map((e) => e.ordre);
    expect([...ordres].sort((a, b) => a - b)).toEqual(ordres);

    // L'accusé d'ouverture précède toujours la transmission au cabinet.
    const indexOuvert = corpsTous.emails.findIndex((e) => e.sujet.includes("ouvert"));
    const indexTransmis = corpsTous.emails.findIndex((e) => e.sujet.includes("transmis"));
    if (indexOuvert >= 0 && indexTransmis >= 0) {
      expect(indexOuvert).toBeLessThan(indexTransmis);
    }
  });
});
