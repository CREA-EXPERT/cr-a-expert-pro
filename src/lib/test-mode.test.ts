import { describe, expect, it, vi } from "vitest";
import {
  estDossierTest,
  estEmailTest,
  exclureDossiersTest,
  piecesFacultatives,
  preparerEnvoiTest,
  PREFIXE_TEST,
  PREFIXE_TEST_CABINET,
} from "./test-mode";

const dossierTest = { id: "t", est_test: true, documents_plus_tard: false };
const dossierReel = { id: "r", est_test: false, documents_plus_tard: false };

describe("détection des comptes et dossiers de test", () => {
  it("reconnaît une adresse d'alias +test", () => {
    expect(estEmailTest("prenom+test3@gmail.com")).toBe(true);
    expect(estEmailTest("prenom@gmail.com")).toBe(false);
    expect(estEmailTest(null)).toBe(false);
  });

  it("exclut les dossiers de test des statistiques, jamais les dossiers réels", () => {
    const restants = exclureDossiersTest([dossierTest, dossierReel]);
    expect(restants).toHaveLength(1);
    expect(restants[0]!.id).toBe("r");
    expect(estDossierTest(dossierReel)).toBe(false);
  });
});

describe("emails des dossiers de test", () => {
  it("préfixe l'objet et force le destinataire sur l'adresse du compte de test", () => {
    const envoi = preparerEnvoiTest({
      sujet: "Votre dossier de création est ouvert",
      destinataire: "cabinet@crea-expert.fr",
      estTest: true,
      emailTest: "prenom+test3@gmail.com",
    });
    expect(envoi.sujet.startsWith(PREFIXE_TEST)).toBe(true);
    expect(envoi.destinataire).toBe("prenom+test3@gmail.com");
  });

  it("marque la copie cabinet et n'envoie qu'au compte de test", () => {
    const envoi = preparerEnvoiTest({
      sujet: "Nouveau dossier",
      destinataire: "cabinet@crea-expert.fr",
      estTest: true,
      emailTest: "prenom+test3@gmail.com",
      pourCabinet: true,
    });
    expect(envoi.sujet.startsWith(PREFIXE_TEST_CABINET)).toBe(true);
    expect(envoi.destinataire).toBe("prenom+test3@gmail.com");
  });

  it("laisse un dossier réel intact", () => {
    const envoi = preparerEnvoiTest({
      sujet: "Votre dossier est transmis",
      destinataire: "client@example.com",
      estTest: false,
    });
    expect(envoi.sujet).toBe("Votre dossier est transmis");
    expect(envoi.destinataire).toBe("client@example.com");
  });
});

describe("case « documents plus tard »", () => {
  it("n'est jamais active sur un dossier réel", () => {
    expect(piecesFacultatives({ est_test: false, documents_plus_tard: true })).toBe(false);
  });

  it("lève le verrou de complétude uniquement sur un dossier de test coché", () => {
    expect(piecesFacultatives(dossierTest)).toBe(false);
    expect(piecesFacultatives({ ...dossierTest, documents_plus_tard: true })).toBe(true);
  });

  it("laisse les pièces manquantes listées mais non bloquantes", () => {
    const lignes = [
      { cle: "identite", etat: "manquant", piece: true },
      { cle: "capital", etat: "manquant", piece: false },
    ];
    const dossier = { ...dossierTest, documents_plus_tard: true };
    const bloquants = lignes.filter(
      (l) => l.etat === "manquant" && !(piecesFacultatives(dossier) && l.piece),
    );
    expect(lignes.filter((l) => l.etat === "manquant")).toHaveLength(2);
    expect(bloquants.map((l) => l.cle)).toEqual(["capital"]);
  });
});

describe("purge d'un dossier de test", () => {
  it("supprime les fichiers des buckets du dossier et refuse un dossier réel", async () => {
    const removes: { bucket: string; chemins: string[] }[] = [];
    const supprimees: { table: string; id: string }[] = [];
    const dossiers = new Map([
      ["test-1", { id: "test-1", est_test: true, denomination: "TEST SAS" }],
      ["reel-1", { id: "reel-1", est_test: false, denomination: "VRAIE SAS" }],
    ]);

    vi.doMock("@/integrations/supabase/client.server", () => {
      const requete = (table: string) => ({
        select: () => ({
          eq: (_c: string, valeur: string) => ({
            maybeSingle: async () => ({ data: dossiers.get(valeur) ?? null, error: null }),
            then: undefined,
          }),
        }),
        delete: () => ({
          eq: async (_c: string, valeur: string) => {
            supprimees.push({ table, id: valeur });
            if (table === "dossiers") dossiers.delete(valeur);
            return { error: null };
          },
          in: async () => ({ error: null }),
        }),
      });
      return {
        supabaseAdmin: {
          from: (table: string) =>
            table === "signatures_electroniques"
              ? {
                  select: () => ({ eq: async () => ({ data: [], error: null }) }),
                  delete: () => ({ eq: async () => ({ error: null }) }),
                }
              : requete(table),
          storage: {
            from: (bucket: string) => ({
              list: async (prefixe: string) =>
                prefixe === "test-1"
                  ? {
                      data: [{ id: "f1", name: "piece.pdf", metadata: { size: 12 } }],
                      error: null,
                    }
                  : { data: [], error: null },
              remove: async (chemins: string[]) => {
                removes.push({ bucket, chemins });
                return { error: null };
              },
              createSignedUrl: async () => ({ data: { signedUrl: "https://exemple" } }),
            }),
          },
        },
      };
    });

    const { purgerDossierTest } = await import("./purge-test.server");

    const resultat = await purgerDossierTest("test-1");
    expect(resultat.fichiersSupprimes).toBe(2);
    expect(removes.map((r) => r.bucket).sort()).toEqual(["documents", "kyc-odeon"]);
    expect(supprimees.some((s) => s.table === "dossiers" && s.id === "test-1")).toBe(true);
    expect(supprimees.every((s) => s.id === "test-1")).toBe(true);
    expect(dossiers.has("reel-1")).toBe(true);

    await expect(purgerDossierTest("reel-1")).rejects.toThrow(/pas un dossier de test/);
    vi.doUnmock("@/integrations/supabase/client.server");
  });
});
