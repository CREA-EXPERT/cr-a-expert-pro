/**
 * Étapes du parcours de création : clés, libellés et correspondance avec les
 * étapes citées par les contrôles juridiques. Partagé entre le wizard et les
 * écrans qui renvoient vers une étape précise (guide de correction).
 */

export type Cle =
  | "forme"
  | "denomination"
  | "siege"
  | "objet"
  | "capital"
  | "associes"
  | "situation"
  | "options"
  | "mission"
  | "validation"
  | "paiement"
  | "recap";

export const CLES_SOCIETE: Cle[] = [
  "forme",
  "denomination",
  "siege",
  "objet",
  "capital",
  "associes",
  "situation",
  "options",
  "mission",
  "validation",
  "paiement",
  "recap",
];

export const CLES_EI: Cle[] = [
  "forme",
  "denomination",
  "siege",
  "objet",
  "associes",
  "situation",
  "options",
  "mission",
  "validation",
  "paiement",
  "recap",
];

export const TITRES: Record<Cle, string> = {
  forme: "Forme juridique",
  denomination: "Dénomination (nom de la société)",
  siege: "Siège social",
  objet: "Objet social",
  capital: "Capital",
  associes: "Associés et gérance",
  situation: "Votre situation et vos justificatifs",
  options: "Options fiscales et sociales",
  mission: "Lettre de mission",
  validation: "Votre offre",
  paiement: "Frais légaux et moyen de paiement",
  recap: "Récapitulatif",
};

/** Libellés d'étapes employés par les contrôles juridiques → clé du parcours. */
const ETAPE_VERS_CLE: Record<string, Cle> = {
  "Forme juridique": "forme",
  Dénomination: "denomination",
  "Siège social": "siege",
  "Objet social": "objet",
  Capital: "capital",
  Associés: "associes",
  Fiscalité: "options",
  Récapitulatif: "recap",
};

/**
 * Numéro d'étape du parcours (1-indexé) où corriger un champ manquant.
 * Renvoie `null` si l'étape citée n'existe pas dans le parcours en cours.
 */
export function numeroEtape(libelle: string, ei: boolean): number | null {
  const cle = ETAPE_VERS_CLE[libelle];
  if (!cle) return null;
  const index = (ei ? CLES_EI : CLES_SOCIETE).indexOf(cle);
  return index < 0 ? null : index + 1;
}
