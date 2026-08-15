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
const CLE = process.env["EMAILS_TEST_INTERCEPT_KEY"];

test.describe("Boîte de test — refus", () => {
  test.skip(INTERCEPTION_ACTIVE, "Interception activée : l'endpoint est ouvert.");

  test("la lecture est refusée (403) quand l'interception est désactivée", async ({ request }) => {
    const reponse = await request.get("/api/public/emails-test");
    expect(reponse.status()).toBe(403);
  });

  test("les filtres ne contournent pas le refus", async ({ request }) => {
    const reponse = await request.get("/api/public/emails-test?tag=dossier_ouvert&dossier=1");
    expect(reponse.status()).toBe(403);
  });

  test("une clé fantaisiste ne donne aucun accès", async ({ request }) => {
    const reponse = await request.get("/api/public/emails-test", {
      headers: { "x-test-inbox-key": "cle-invalide" },
    });
    expect(reponse.status()).toBe(403);
  });

  test("les méthodes d'écriture sont refusées", async ({ request }) => {
    for (const appel of [
      request.post("/api/public/emails-test", { data: {} }),
      request.delete("/api/public/emails-test"),
    ]) {
      const reponse = await appel;
      expect(reponse.status()).toBe(403);
    }
  });

  test("la confirmation automatique est refusée", async ({ request }) => {
    const reponse = await request.post("/api/public/emails-test/confirmer", {
      data: { email: "quelqu-un+test@example.fr" },
    });
    expect(reponse.status()).toBe(403);
    const enLecture = await request.get("/api/public/emails-test/confirmer");
    expect(enLecture.status()).toBe(403);
  });
});

test.describe("Boîte de test — lecture", () => {
  test.skip(!INTERCEPTION_ACTIVE, "Nécessite EMAILS_TEST_INTERCEPT=1.");
  const entetes = CLE ? { "x-test-inbox-key": CLE } : undefined;

  test("les emails interceptés sont lisibles par étiquette et ordonnés", async ({ request }) => {
    const ouverts = await request.get("/api/public/emails-test?tag=dossier_ouvert", {
      headers: entetes,
    });
    expect(ouverts.ok()).toBeTruthy();
    const corpsOuverts = (await ouverts.json()) as { emails: Array<{ tag: string }> };
    expect(corpsOuverts.emails.every((e) => e.tag === "dossier_ouvert")).toBeTruthy();

    const tous = await request.get("/api/public/emails-test", { headers: entetes });
    const corpsTous = (await tous.json()) as { emails: Array<{ ordre: number }> };
    const ordres = corpsTous.emails.map((e) => e.ordre);
    expect([...ordres].sort((a, b) => a - b)).toEqual(ordres);
  });

  test("une adresse hors motif de test ne peut pas être confirmée", async ({ request }) => {
    const reponse = await request.post("/api/public/emails-test/confirmer", {
      headers: entetes,
      data: { email: "client.reel@example.fr" },
    });
    expect(reponse.status()).toBe(403);
  });

  test("un compte de test inconnu n'est pas confirmé", async ({ request }) => {
    const reponse = await request.post("/api/public/emails-test/confirmer", {
      headers: entetes,
      data: { email: `inconnu+test-${Date.now()}@example.fr`, sansEmail: true },
    });
    expect(reponse.status()).toBe(404);
  });
});
