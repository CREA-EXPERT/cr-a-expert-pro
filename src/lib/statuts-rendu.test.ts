/**
 * Rendu des statuts : garde centrale, contenu du PDF (mention art. 22,
 * filigrane, clauses obligatoires) et modes de rendu.
 *
 * Le texte est extrait avec pdfjs-dist, utilisé uniquement en test.
 */

import { describe, expect, it } from "vitest";
import type { Associe, Dossier } from "./documents";
import { genererPdf, MENTION_ART_22, renduPour } from "./pdf";
import { clausesManquantes, type Gabarit } from "./statuts-clauses";
import { gabaritApplique } from "./statuts-controles";

/** Extrait le texte de toutes les pages d'un PDF généré. */
async function lirePdf(octets: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(octets),
    useSystemFonts: false,
  }).promise;
  let texte = "";
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const contenu = await page.getTextContent();
    texte += contenu.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .concat("\n");
  }
  return { texte: texte.replace(/\s+/g, " "), pages: doc.numPages };
}

const associe = (extra: Partial<Associe>): Associe =>
  ({
    id: Math.random().toString(16).slice(2),
    type: "personne_physique",
    est_associe: true,
    est_dirigeant: false,
    civilite: "Monsieur",
    prenom: "Jean",
    prenoms: ["Jean"],
    nom: "Durand",
    date_naissance: "1980-05-12",
    lieu_naissance: "Lyon",
    nationalite: "française",
    adresse: "12 rue des Lilas, 69003 Lyon",
    situation_matrimoniale: "celibataire",
    nb_titres: 100,
    montant_apport: 1000,
    ...extra,
  }) as unknown as Associe;

const dossier = (extra: Partial<Dossier>): Dossier =>
  ({
    id: "dossier-test",
    denomination: "ESSAI CONSEIL",
    siege_adresse: "12 rue des Lilas, 69003 Lyon",
    objet_social: "Conseil aux entreprises.",
    capital_montant: 1000,
    valeur_part: 10,
    banque_depot: "Banque de l'Ouest",
    ville_signature: "Lyon",
    date_cloture_premier_exercice: "2027-12-31",
    date_signature: "2026-08-01",
    date_consentements: "2026-08-01",
    ...extra,
  }) as unknown as Dossier;

const president = associe({ est_dirigeant: true, fonction: "president" } as unknown as Partial<Associe>);
const gerant = associe({ est_dirigeant: true, fonction: "gerant" } as unknown as Partial<Associe>);

const secondAssocie = associe({
  civilite: "Madame",
  prenom: "Alice",
  prenoms: ["Alice"],
  nom: "Bernard",
  nb_titres: 50,
  montant_apport: 500,
});

const CAS: { nom: string; gabarit: Gabarit; dossier: Dossier; associes: Associe[] }[] = [
  { nom: "SASU", gabarit: "SAS", dossier: dossier({ forme_juridique: "SAS" }), associes: [president] },
  {
    nom: "SARL",
    gabarit: "SARL",
    dossier: dossier({ forme_juridique: "SARL" }),
    associes: [
      associe({ est_dirigeant: true, fonction: "gerant", nb_titres: 50, montant_apport: 500 } as unknown as Partial<Associe>),
      secondAssocie,
    ],
  },
  {
    nom: "EURL",
    gabarit: "EURL",
    dossier: dossier({ forme_juridique: "EURL", regime_fiscal_eurl: "ir" } as unknown as Partial<Dossier>),
    associes: [gerant],
  },
  {
    nom: "SCI",
    gabarit: "SCI",
    dossier: dossier({
      forme_juridique: "SCI",
      regime_fiscal_sci: "ir",
      greffe_ville: "Lyon",
    } as unknown as Partial<Dossier>),
    associes: [
      associe({ est_dirigeant: true, fonction: "gerant", nb_titres: 50, montant_apport: 500 } as unknown as Partial<Associe>),
      secondAssocie,
    ],
  },
];

describe("génération des statuts, tous gabarits", () => {
  for (const cas of CAS) {
    it(`${cas.nom} : génère un document paginé portant la mention de l'article 22`, async () => {
      expect(gabaritApplique(cas.dossier, cas.associes)).toBe(cas.gabarit);
      const octets = await genererPdf("statuts", cas.dossier, cas.associes, null);
      const { texte, pages } = await lirePdf(octets);
      expect(pages).toBeGreaterThan(1);
      expect(texte).toContain(MENTION_ART_22.slice(0, 60));
      expect(texte).toContain("PROJET");
    }, 30_000);
  }
});

describe("garde centrale de génération", () => {
  it("refuse un dossier incomplet en citant le champ et son étape", async () => {
    const d = dossier({ forme_juridique: "SAS", denomination: null } as unknown as Partial<Dossier>);
    await expect(genererPdf("statuts", d, [president], null)).rejects.toThrow(
      /Dénomination sociale.*Dénomination/s,
    );
  });

  it("refuse un dossier comportant un apport en nature", async () => {
    const d = dossier({ forme_juridique: "SAS", apport_nature: true } as unknown as Partial<Dossier>);
    await expect(genererPdf("statuts", d, [president], null)).rejects.toThrow(/apport en nature/i);
  });
});

describe("modes de rendu", () => {
  it("filigrane avant validation, absent après validation du cabinet", async () => {
    const projet = CAS[0]!;
    expect(renduPour(projet.dossier).filigrane).toBe(true);

    const valide = dossier({ forme_juridique: "SAS", valide_par: "cabinet-1" } as unknown as Partial<Dossier>);
    expect(renduPour(valide)).toEqual({ filigrane: false, pied: null });
    const { texte } = await lirePdf(await genererPdf("statuts", valide, [president], null));
    expect(texte).not.toContain("PROJET");
  }, 30_000);

  it("auto-validation : pied de page accentué, sans filigrane", async () => {
    const auto = dossier({
      forme_juridique: "SAS",
      voie_validation: "auto",
      autovalidation_le: "2026-08-02",
    } as unknown as Partial<Dossier>);
    const rendu = renduPour(auto);
    expect(rendu.filigrane).toBe(false);
    expect(rendu.pied).toBe(
      "Document généré à partir des réponses du déclarant — non revu par un professionnel.",
    );
    const { texte } = await lirePdf(await genererPdf("statuts", auto, [president], null));
    expect(texte).toContain("Document généré à partir des réponses du déclarant");
    expect(texte).not.toContain("PROJET");
  }, 30_000);
});

describe("clauses propres à chaque forme", () => {
  it("la SAS ne comporte aucune clause de l'article 1832-2", async () => {
    const { texte } = await lirePdf(
      await genererPdf("statuts", CAS[0]!.dossier, CAS[0]!.associes, null),
    );
    expect(texte).not.toContain("1832-2");
  }, 30_000);

  it("la SARL avec conjoint concerné comporte la clause de l'article 1832-2", async () => {
    const marie = associe({
      est_dirigeant: true,
      fonction: "gerant",
      nb_titres: 50,
      montant_apport: 500,
      situation_matrimoniale: "marie",
      regime_matrimonial: "communaute_legale",
      date_mariage: "2010-06-12",
      lieu_mariage: "Lyon",
      conjoint_civilite: "Madame",
      conjoint_nom: "Durand",
      conjoint_prenom: "Marie",
      conjoint_date_naissance: "1982-03-04",
      conjoint_lieu_naissance: "Lyon",
      conjoint_revendique: true,
      apport_fonds_communs: true,
    } as unknown as Partial<Associe>);
    const d = dossier({ forme_juridique: "SARL" });
    const { texte } = await lirePdf(
      await genererPdf("statuts", d, [marie, secondAssocie], null),
    );
    expect(texte).toContain("1832-2");
  }, 30_000);

  it("aucune clause obligatoire ne manque sur les rendus complets", async () => {
    for (const cas of CAS) {
      const octets = await genererPdf("statuts", cas.dossier, cas.associes, null);
      const { texte } = await lirePdf(octets);
      const intitules = texte.split(/ARTICLE\s+/i).map((t) => t.slice(0, 120));
      expect(clausesManquantes(cas.gabarit, intitules)).toEqual([]);
    }
  }, 60_000);
});
