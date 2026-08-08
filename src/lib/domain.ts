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
  { value: "communaute_legale", label: "Communauté légale (réduite aux acquêts)" },
  { value: "communaute_universelle", label: "Communauté universelle" },
  { value: "separation_biens", label: "Séparation de biens" },
  { value: "participation_acquets", label: "Participation aux acquêts" },
  { value: "indivision_pacs", label: "PACS — indivision" },
  { value: "separation_pacs", label: "PACS — séparation de patrimoines" },
  { value: "non_applicable", label: "Non applicable" },
];

export const REGIMES_COMMUNAUTAIRES = ["communaute_legale", "communaute_universelle"];

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
  "Information générale — ne constitue pas un conseil. Votre dossier sera revu par un expert-comptable.";

export const euro = (n: number | null | undefined) =>
  typeof n === "number" ? n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) : "—";
