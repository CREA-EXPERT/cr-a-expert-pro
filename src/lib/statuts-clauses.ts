/**
 * Contrôle des clauses obligatoires des statuts générés.
 *
 * Chaque gabarit (SAS/SASU, SARL, EURL, SCI) doit comporter un socle de clauses
 * imposées par la loi. Le rendu enregistre les intitulés d'articles écrits ; ce
 * module vérifie que le socle y figure et bloque la génération à défaut.
 */

export type Gabarit = "SAS" | "SARL" | "EURL" | "SCI";

export type ClauseObligatoire = {
  /** Libellé lisible, affiché au client en cas d'absence. */
  libelle: string;
  /** Motif recherché dans les intitulés d'articles du document généré. */
  motif: RegExp;
  /** Référence légale de la mention obligatoire. */
  reference: string;
};

const COMMUNES: ClauseObligatoire[] = [
  { libelle: "Forme de la société", motif: /\bforme\b/i, reference: "art. 1835 C. civ." },
  { libelle: "Objet social", motif: /\bobjet\b/i, reference: "art. 1835 C. civ." },
  { libelle: "Dénomination sociale", motif: /dénomination/i, reference: "art. 1835 C. civ." },
  { libelle: "Siège social", motif: /siège/i, reference: "art. 1835 C. civ." },
  { libelle: "Durée de la société", motif: /\bdurée\b/i, reference: "art. 1838 C. civ." },
  { libelle: "Apports", motif: /apports?\b/i, reference: "art. 1835 C. civ." },
  { libelle: "Capital social", motif: /capital social/i, reference: "art. 1835 C. civ." },
  { libelle: "Exercice social", motif: /exercice social/i, reference: "art. L. 123-12 C. com." },
  {
    libelle: "Affectation et répartition des résultats",
    motif: /(affectation|répartition).*(résultat|bénéfice)/i,
    reference: "art. 1844-1 C. civ.",
  },
  { libelle: "Dissolution et liquidation", motif: /(dissolution|liquidation)/i, reference: "art. 1844-7 C. civ." },
];

const CESSION: ClauseObligatoire = {
  libelle: "Cession et transmission des titres",
  motif: /(cession|transmission)/i,
  reference: "art. L. 223-14 C. com. / art. 1861 C. civ.",
};

const DIRECTION_SARL: ClauseObligatoire = {
  libelle: "Gérance : nomination, pouvoirs et cessation des fonctions",
  motif: /(gérance|gérant)/i,
  reference: "art. L. 223-18 C. com.",
};

const DECISIONS: ClauseObligatoire = {
  libelle: "Décisions collectives des associés",
  motif: /(décisions? (collectives?|de l'associé)|assemblée)/i,
  reference: "art. L. 223-27 C. com. / art. 1852 C. civ.",
};

const COMPTES: ClauseObligatoire = {
  libelle: "Comptes sociaux",
  motif: /comptes (sociaux|annuels)/i,
  reference: "art. L. 232-1 C. com.",
};

export const CLAUSES_OBLIGATOIRES: Record<Gabarit, ClauseObligatoire[]> = {
  SAS: [
    ...COMMUNES,
    CESSION,
    COMPTES,
    DECISIONS,
    {
      libelle: "Présidence de la société",
      motif: /président/i,
      reference: "art. L. 227-6 C. com.",
    },
    {
      libelle: "Conventions réglementées",
      motif: /conventions/i,
      reference: "art. L. 227-10 C. com.",
    },
  ],
  SARL: [...COMMUNES, CESSION, COMPTES, DECISIONS, DIRECTION_SARL],
  EURL: [
    ...COMMUNES,
    CESSION,
    COMPTES,
    DIRECTION_SARL,
    {
      libelle: "Décisions de l'associé unique",
      motif: /décisions? de l'associé unique/i,
      reference: "art. L. 223-31 C. com.",
    },
    {
      libelle: "Conventions entre la société et son gérant ou son associé",
      motif: /conventions/i,
      reference: "art. L. 223-19 C. com.",
    },
  ],
  SCI: [
    ...COMMUNES,
    CESSION,
    COMPTES,
    DECISIONS,
    { libelle: "Gérance", motif: /gérance/i, reference: "art. 1846 C. civ." },
    {
      libelle: "Responsabilité indéfinie des associés",
      motif: /responsabilité des associés/i,
      reference: "art. 1857 C. civ.",
    },
  ],
};

/** Clauses obligatoires absentes des intitulés d'articles réellement écrits. */
export function clausesManquantes(gabarit: Gabarit, intitules: string[]): ClauseObligatoire[] {
  return CLAUSES_OBLIGATOIRES[gabarit].filter((c) => !intitules.some((t) => c.motif.test(t)));
}

/** Message d'erreur bloquant, formulé pour le client. */
export function messageClausesManquantes(manquantes: ClauseObligatoire[]) {
  return `Statuts non générés — clauses obligatoires absentes du document : ${manquantes
    .map((c) => `${c.libelle} (${c.reference})`)
    .join(" ; ")}. Le cabinet doit reprendre le gabarit avant toute transmission.`;
}
