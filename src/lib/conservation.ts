/**
 * Durées de conservation — source unique de vérité.
 * Toute modification de politique de conservation se fait ici, nulle part ailleurs.
 */

export const CONSERVATION = {
  /** Archive KYC (LBC-FT) : 5 ans après la fin de la relation d'affaires. */
  KYC_ANNEES: 5,
  /** Pièce d'identité, dossier terminal SANS cabinet engagé. */
  PIECE_ID_SANS_KYC_JOURS: 30,
  /** Dossier abandonné : délai avant purge (et avant archivage KYC si cabinet engagé). */
  DOSSIER_ABANDONNE_JOURS: 180,
  /** Demandes de contact non converties. */
  DEMANDE_CONTACT_JOURS: 1095,
  /** Comptes sans aucune connexion : anonymisation. */
  COMPTE_INACTIF_JOURS: 1095,
} as const;

/** Bucket privé de travail et bucket privé d'archive KYC (liens signés uniquement). */
export const BUCKET_DOCUMENTS = "documents";
export const BUCKET_KYC = "kyc-odeon";

/** Statuts de dossier. */
export const STATUTS_DOSSIER = [
  "en_cours",
  "siren_attribue",
  "cloture",
  "rejete",
  "impossible",
  "abandonne",
] as const;
export type StatutDossier = (typeof STATUTS_DOSSIER)[number];

/** États terminaux : la relation d'affaires ne se poursuit plus au titre de la création. */
export const STATUTS_TERMINAUX: readonly string[] = [
  "siren_attribue",
  "cloture",
  "rejete",
  "impossible",
  "abandonne",
];

/** États terminaux déclenchant l'archivage KYC lorsque le cabinet est engagé. */
export const STATUTS_ARCHIVAGE_KYC: readonly string[] = [
  "siren_attribue",
  "abandonne",
  "rejete",
  "impossible",
];

/** Types de pièces relevant du périmètre « identité / vigilance ». */
export const TYPES_PIECE_IDENTITE: readonly string[] = ["piece_identite"];
export const TYPES_VIGILANCE: readonly string[] = ["beneficiaires_effectifs", "non_condamnation"];

/** Données jamais purgées : facturation (10 ans), statuts, preuves de signature. */
export const HORS_PERIMETRE_PURGE: readonly string[] = [
  "archives_facturation",
  "params_tarifs",
  "signatures_electroniques",
  "statuts",
];

export function joursEcoules(depuis: string | null | undefined, maintenant = new Date()) {
  if (!depuis) return null;
  return Math.floor((maintenant.getTime() - new Date(depuis).getTime()) / 86_400_000);
}

/** Délai applicable à la purge des pièces d'identité d'un dossier sans cabinet engagé. */
export function delaiPurgePieceIdentite(statut: string) {
  return statut === "abandonne"
    ? CONSERVATION.DOSSIER_ABANDONNE_JOURS
    : CONSERVATION.PIECE_ID_SANS_KYC_JOURS;
}

/** Date limite de conservation d'une archive KYC. */
export function echeanceKyc(dateFinRelation: string) {
  const d = new Date(dateFinRelation);
  d.setFullYear(d.getFullYear() + CONSERVATION.KYC_ANNEES);
  return d.toISOString().slice(0, 10);
}
