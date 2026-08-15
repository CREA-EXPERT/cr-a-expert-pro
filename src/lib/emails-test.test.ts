import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Interception d'envoi en environnement de test automatisé : les emails sont
 * écrits dans `emails_test` au lieu d'appeler Resend.
 */
const inserts: Array<{ table: string; ligne: Record<string, unknown> }> = [];

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from(table: string) {
      return {
        insert: async (ligne: Record<string, unknown>) => {
          inserts.push({ table, ligne });
          return { error: null };
        },
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null }) }),
        }),
      };
    },
  },
}));

describe("boîte de réception de test", () => {
  beforeEach(() => {
    inserts.length = 0;
    process.env["EMAILS_TEST_INTERCEPT"] = "1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Resend ne doit jamais être appelé en test automatisé");
      }),
    );
  });

  afterEach(() => {
    delete process.env["EMAILS_TEST_INTERCEPT"];
    vi.unstubAllGlobals();
  });

  it("écrit l'email avec son étiquette et n'appelle pas Resend", async () => {
    const { envoyerEmail, interceptionTestActive } = await import("./email.server");
    expect(interceptionTestActive()).toBe(true);

    const resultat = await envoyerEmail({
      destinataire: "client+test@example.fr",
      sujet: "Votre dossier de création est ouvert",
      html: "<p>Bonjour</p>",
      tag: "dossier_ouvert",
    });

    expect(resultat).toEqual({ envoye: true });
    const boite = inserts.filter((i) => i.table === "emails_test");
    expect(boite).toHaveLength(1);
    expect(boite[0]?.ligne).toMatchObject({
      destinataire: "client+test@example.fr",
      tag: "dossier_ouvert",
      pour_cabinet: false,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("l'étiquette par défaut est « generique »", async () => {
    const { envoyerEmail } = await import("./email.server");
    await envoyerEmail({ destinataire: "a@b.fr", sujet: "Objet", html: "<p>x</p>" });
    expect(inserts.at(-1)?.ligne["tag"]).toBe("generique");
  });
});
