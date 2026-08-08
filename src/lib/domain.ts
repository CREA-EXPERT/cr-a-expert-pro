export type Forme = "SASU" | "SAS" | "EURL" | "SARL" | "SCI" | "EI";

export const FORMES: { value: Forme; label: string; desc: string }[] = [
  { value: "SASU", label: "SASU", desc: "Société par actions simplifiée unipersonnelle — un seul associé." },
  { value: "SAS", label: "SAS", desc: "Société par actions simplifiée — plusieurs associés." },
  { value: "EURL", label: "EURL", desc: "Société à responsabilité limitée à associé unique." },
  { value: "SARL", label: "SARL", desc: "Société à responsabilité limitée — plusieurs associés." },
  { value: "SCI", label: "SCI", desc: "Société civile immobilière — gestion immobilière patrimoniale." },
  {
    value: "EI",
    label: "Entreprise individuelle",
    desc: "À l'impôt sur le revenu, avec option possible pour l'impôt sur les sociétés. Pas de statuts, pas de capital, pas d'annonce légale.",
  },
];

/** Formes sociétaires uniquement (l'entreprise individuelle n'est pas une société). */
export const FORMES_SOCIETES = FORMES.filter((f) => f.value !== "EI");

export const FORMES_SAS: Forme[] = ["SAS", "SASU"];
export const FORMES_COMMUNAUTE: Forme[] = ["SARL", "EURL", "SCI"];

export const isSas = (f: string) => FORMES_SAS.includes(f as Forme);
export const isCivile = (f: string) => f === "SCI";
export const isEI = (f: string) => f === "EI";
export const liberationMin = (f: string) => (isSas(f) ? 50 : isCivile(f) ? 0 : 20);

export const fonctionsPour = (f: string) =>
  isSas(f)
    ? [
        { value: "president", label: "Président" },
        { value: "directeur_general", label: "Directeur général" },
      ]
    : [{ value: "gerant", label: "Gérant" }];

/** Rôles que le demandeur peut occuper, selon le minimum légal propre à la forme. */
export const rolesPour = (f: string): { v: string; t: string }[] => {
  if (isEI(f)) return [];
  if (f === "SASU") return [{ v: "gerant", t: "Je serai président" }, { v: "aucun", t: "Je ne serai pas président" }];
  if (f === "SAS")
    return [
      { v: "gerant", t: "Je serai président" },
      { v: "cogerant", t: "Je serai directeur général" },
      { v: "aucun", t: "Je ne dirigerai pas la société" },
    ];
  if (f === "EURL") return [{ v: "gerant", t: "Je serai gérant" }, { v: "aucun", t: "Je ne serai pas gérant" }];
  return [
    { v: "gerant", t: "Je serai gérant" },
    { v: "cogerant", t: "Je serai co-gérant" },
    { v: "aucun", t: "Je ne serai pas gérant" },
  ];
};

/** Rappel du minimum légal de direction pour la forme choisie. */
export const minimumLegal = (f: string): string => {
  switch (f) {
    case "EI":
      return "L'entreprise individuelle n'a pas de dirigeant à nommer : l'entrepreneur exerce en son nom propre.";
    case "SASU":
      return "La SASU est dirigée par un président unique, personne physique ou morale, associé ou non. D'autres dirigeants (directeur général) peuvent être prévus par les statuts.";
    case "SAS":
      return "La SAS doit obligatoirement avoir un président ; les statuts peuvent créer d'autres organes de direction, notamment un ou plusieurs directeurs généraux.";
    case "EURL":
      return "L'EURL est dirigée par un gérant unique, nécessairement une personne physique, associé ou non.";
    case "SARL":
      return "La SARL est dirigée par un ou plusieurs gérants, nécessairement des personnes physiques, associés ou non.";
    case "SCI":
      return "La SCI est dirigée par un ou plusieurs gérants, personnes physiques ou morales, associés ou non.";
    default:
      return "";
  }
};


export const REGIME_DEFAUT: Record<string, string> = {
  SASU: "Impôt sur les sociétés (IS) par défaut.",
  SAS: "Impôt sur les sociétés (IS) par défaut.",
  EURL: "Impôt sur le revenu (IR) par défaut lorsque l'associé unique est une personne physique ; option possible pour l'IS.",
  SARL: "Impôt sur les sociétés (IS) par défaut.",
  SCI: "Impôt sur le revenu (IR) par défaut ; option possible pour l'IS.",
  EI: "Impôt sur le revenu (IR) par défaut ; une option pour l'impôt sur les sociétés est possible.",
};

export const OBJETS_TYPES: { titre: string; texte: string }[] = [
  {
    titre: "Conseil aux entreprises",
    texte:
      "Le conseil pour les affaires et autres conseils de gestion auprès des entreprises et des organisations, l'assistance opérationnelle et l'accompagnement de projets.",
  },
  {
    titre: "Développement informatique",
    texte:
      "La conception, le développement, l'édition, la maintenance et l'hébergement de logiciels, d'applications et de sites internet, ainsi que toute prestation de services informatiques.",
  },
  {
    titre: "E-commerce",
    texte:
      "L'achat, la vente et la distribution, au détail comme en gros, de tous produits non réglementés, par tous moyens et notamment par internet.",
  },
  {
    titre: "Bâtiment second œuvre (non réglementé)",
    texte:
      "Tous travaux de second œuvre du bâtiment ne relevant pas d'une activité réglementée, notamment peinture, revêtements de sols et murs, agencement et finitions.",
  },
  {
    titre: "Restauration",
    texte:
      "L'exploitation de tous établissements de restauration sur place, à emporter ou en livraison, ainsi que toute activité de traiteur.",
  },
  {
    titre: "Transport léger de marchandises",
    texte:
      "Le transport public routier de marchandises au moyen de véhicules n'excédant pas 3,5 tonnes, ainsi que la livraison et la logistique associées.",
  },
  {
    titre: "Formation (non réglementée)",
    texte:
      "La conception et l'animation de formations, séminaires et ateliers ne relevant pas d'une activité réglementée, en présentiel comme à distance.",
  },
  {
    titre: "Marketing digital",
    texte:
      "Le conseil en communication et en marketing, la création de contenus, la gestion de campagnes publicitaires et l'animation de réseaux sociaux.",
  },
  {
    titre: "Gestion immobilière patrimoniale (SCI)",
    texte:
      "L'acquisition, la propriété, l'administration, la gestion et la location de tous biens et droits immobiliers, à titre civil et patrimonial.",
  },
  {
    titre: "Artisanat d'art",
    texte:
      "La création, la fabrication, la restauration et la commercialisation d'objets et de pièces relevant des métiers d'art.",
  },
  {
    titre: "Services à la personne (non réglementés)",
    texte:
      "La fourniture de services à la personne ne relevant pas d'une activité réglementée, notamment l'entretien du domicile, le petit bricolage et l'assistance administrative.",
  },
  {
    titre: "Holding",
    texte:
      "La prise de participation dans toutes sociétés, la gestion de ces participations, ainsi que la fourniture de prestations administratives et de gestion à ses filiales.",
  },
];

export const STATUTS = [
  "brouillon",
  "dossier_valide_client",
  "pieces_en_cours",
  "en_revue_cabinet",
  "valide_cabinet",
  "pret_au_depot",
  "depose",
  "immatricule",
] as const;
export type Statut = (typeof STATUTS)[number];

export const STATUT_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  dossier_valide_client: "Dossier validé par vos soins",
  pieces_en_cours: "Pièces en cours de dépôt",
  en_revue_cabinet: "En revue par le cabinet",
  valide_cabinet: "Validé par le cabinet",
  pret_au_depot: "Prêt au dépôt",
  depose: "Déposé",
  immatricule: "Immatriculée",
};

export const PROCHAINE_ACTION: Record<string, string> = {
  brouillon: "Complétez votre dossier en ligne.",
  dossier_valide_client: "Déposez les pièces demandées dans « Mes documents ».",
  pieces_en_cours: "Déposez les pièces encore manquantes.",
  en_revue_cabinet: "Le cabinet examine votre dossier. Aucune action de votre part.",
  valide_cabinet: "Le cabinet prépare le dépôt de votre dossier.",
  pret_au_depot: "Le dépôt va être effectué. Aucune action de votre part.",
  depose: "Le dossier est déposé, l'immatriculation est en cours.",
  immatricule: "Votre société est immatriculée.",
};

export const SITUATIONS = [
  { value: "celibataire", label: "Célibataire" },
  { value: "marie", label: "Marié(e)" },
  { value: "pacse", label: "Pacsé(e)" },
  { value: "divorce", label: "Divorcé(e)" },
  { value: "veuf", label: "Veuf / Veuve" },
];

export const REGIMES = [
  { value: "communaute_legale", label: "Communauté légale (réduite aux acquêts) — sans contrat de mariage" },
  { value: "communaute_universelle", label: "Communauté universelle (avec contrat)" },
  { value: "communaute_meubles_acquets", label: "Communauté de meubles et acquêts (ancien régime légal, avant 1966)" },
  { value: "separation_biens", label: "Séparation de biens (avec contrat)" },
  { value: "separation_societe_acquets", label: "Séparation de biens avec société d'acquêts (avec contrat)" },
  { value: "participation_acquets", label: "Participation aux acquêts (avec contrat)" },
  { value: "regime_etranger", label: "Régime matrimonial étranger" },
  { value: "indivision_pacs", label: "PACS — indivision (avec convention)" },
  { value: "separation_pacs", label: "PACS — séparation de patrimoines (régime légal, sans convention particulière)" },
  { value: "non_applicable", label: "Non applicable" },
];

/** Régimes proposés aux personnes mariées. */
export const REGIMES_MARIAGE = REGIMES.filter(
  (r) => !r.value.endsWith("_pacs") && r.value !== "non_applicable",
);

/** Régimes proposés aux personnes pacsées. */
export const REGIMES_PACS = REGIMES.filter((r) => r.value.endsWith("_pacs"));

/** Régimes impliquant une masse commune : l'apport peut provenir de fonds communs. */
export const REGIMES_COMMUNAUTAIRES = [
  "communaute_legale",
  "communaute_universelle",
  "communaute_meubles_acquets",
  "separation_societe_acquets",
  "indivision_pacs",
];

/** Régimes qui supposent nécessairement un contrat ou une convention. */
export const REGIMES_AVEC_CONTRAT = [
  "communaute_universelle",
  "separation_biens",
  "separation_societe_acquets",
  "participation_acquets",
  "indivision_pacs",
];

/** Cabinet d'expertise comptable partenaire. */
export const CABINET = {
  nom: "ODEON",
  mention: "ODEON, cabinet inscrit à l'Ordre des experts-comptables du Grand Est",
};

/** Limites de la prestation de relecture par l'expert-comptable. */
export const RELECTURE_LIMITES = { appels: 3, mails: 3 };


export const TVA_OPTIONS = [
  {
    value: "franchise",
    label: "Franchise en base de TVA",
    desc: "Vous ne facturez pas la TVA et ne la récupérez pas, dans la limite des seuils applicables.",
  },
  {
    value: "reel_simplifie",
    label: "Régime réel simplifié",
    desc: "Vous facturez la TVA avec des déclarations allégées et des acomptes en cours d'année.",
  },
  {
    value: "reel_normal",
    label: "Régime réel normal",
    desc: "Vous facturez la TVA avec une déclaration mensuelle ou trimestrielle.",
  },
];

export const DISCLAIMER =
  "Information générale — ne constitue pas un conseil. Votre dossier peut être revu par un expert-comptable, si vous le souhaitez (option payante).";

export const euro = (n: number | null | undefined) =>
  typeof n === "number" ? n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) : "—";

export const CIVILITES = [
  { value: "Monsieur", label: "Monsieur" },
  { value: "Madame", label: "Madame" },
];

export const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** Dernier jour du mois, au format JJ/MM. */
export const dernierJourDuMois = (mois: number) => {
  const jours = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return `${String(jours[mois - 1]).padStart(2, "0")}/${String(mois).padStart(2, "0")}`;
};

export const PAYS = [
  "France",
  "Allemagne",
  "Belgique",
  "Canada",
  "Espagne",
  "États-Unis",
  "Italie",
  "Luxembourg",
  "Maroc",
  "Pays-Bas",
  "Portugal",
  "Royaume-Uni",
  "Suisse",
  "Tunisie",
  "Autre",
];

export const NB_PRENOMS_MAX = 9;
