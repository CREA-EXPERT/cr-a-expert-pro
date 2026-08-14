import { describe, expect, it } from "vitest";
import type { Associe, Dossier } from "./documents";
import { revuesHumaines } from "./documents";
import { associesEffectifs, repartitionParts } from "./statuts-sarl";
import { basculeSarlRequise } from "./statuts-eurl";
import { gabaritApplique, alertesStatuts } from "./statuts-controles";

const dossier = {
  id: "d1",
  forme_juridique: "EURL",
  capital_montant: 1000,
  valeur_part: 10,
  date_signature: "2026-08-01",
  date_consentements: "2026-08-01",
} as unknown as Dossier;

const base = {
  id: "a1",
  type: "personne_physique",
  est_associe: true,
  est_dirigeant: true,
  prenom: "Claire",
  nom: "Martin",
  civilite: "Madame",
  nb_titres: 100,
  montant_apport: 1000,
  situation_matrimoniale: "marie",
  regime_matrimonial: "communaute_legale",
  apport_fonds_communs: true,
  conjoint_civilite: "Monsieur",
  conjoint_prenom: "Paul",
  conjoint_nom: "Martin",
  conjoint_revendique: true,
} as unknown as Associe;

describe("bascule EURL → SARL sur revendication du conjoint", () => {
  it("déclenche la bascule et applique le gabarit SARL", () => {
    expect(basculeSarlRequise(dossier, [base])).toBe(true);
    expect(gabaritApplique(dossier, [base])).toBe("SARL");
  });

  it("ne bascule pas lorsque le conjoint ne revendique pas", () => {
    const sans = { ...base, conjoint_revendique: false } as Associe;
    expect(basculeSarlRequise(dossier, [sans])).toBe(false);
    expect(gabaritApplique(dossier, [sans])).toBe("EURL");
  });

  it("scinde les parts par moitié et numérote sans discontinuité", () => {
    const effectifs = associesEffectifs(dossier, [base]);
    expect(effectifs).toHaveLength(2);
    expect(effectifs.map((a) => a.nb_titres)).toEqual([50, 50]);
    expect(effectifs.map((a) => a.montant_apport)).toEqual([500, 500]);

    const lignes = repartitionParts(effectifs);
    expect(lignes.map((l) => [l.debut, l.fin])).toEqual([
      [1, 50],
      [51, 100],
    ]);
    expect(lignes.at(-1)?.fin).toBe(100);
    expect(effectifs[1]?.nom).toBe("Martin");
    expect(effectifs[1]?.prenom).toBe("Paul");
  });

  it("arrondit au profit du souscripteur sur un nombre impair de parts", () => {
    const impair = { ...base, nb_titres: 101, montant_apport: 1010 } as Associe;
    const lignes = repartitionParts(associesEffectifs(dossier, [impair]));
    expect(lignes.map((l) => l.parts)).toEqual([51, 50]);
    expect(lignes[1]?.fin).toBe(101);
  });

  it("trace la revue obligatoire du cabinet", () => {
    const motifs = revuesHumaines(dossier, [base]);
    expect(motifs.some((m) => m.includes("1832-2"))).toBe(true);
    expect(alertesStatuts(dossier, [base]).revues.some((m) => m.includes("1832-2"))).toBe(true);
  });
});
