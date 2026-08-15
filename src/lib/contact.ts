/**
 * Source unique des informations de contact et de la consultation payante
 * avec un expert-comptable. Aucun de ces libellés n'est écrit en dur ailleurs.
 */

/** Page de réservation et de paiement de la consultation (hors application). */
export const URL_CALENDLY_CONSULTATION = "https://calendly.com/d/d3vt-kj8-pqf";

/** Adresse de contact de la plateforme (support, demandes entrantes). */
export const EMAIL_CONTACT = "contact@crea-expert.fr";

/** Adresse du cabinet d'expertise comptable partenaire (recommandations). */
export const EMAIL_CABINET = "contact@odeon-expertise.fr";

/** Prix de la consultation d'une heure, source unique d'affichage. */
export const PRIX_CONSULTATION = {
  ttc: "148,80 €",
  ht: "124,00 €",
  tva: "TVA 20 %",
} as const;

/** Libellé complet du prix : « 148,80 € TTC (124,00 € HT, TVA 20 %) — 1 heure ». */
export const LIBELLE_PRIX_CONSULTATION = `${PRIX_CONSULTATION.ttc} TTC (${PRIX_CONSULTATION.ht} HT, ${PRIX_CONSULTATION.tva}) — 1 heure`;

export const TITRE_CONSULTATION = "Besoin d'un avis sur votre situation ?";

export const TEXTE_CONSULTATION =
  "Réservez une consultation d'une heure avec un expert-comptable du cabinet, inscrit à l'Ordre des experts-comptables. Par téléphone, en visioconférence ou par email, au choix. Vous posez toutes vos questions : choix de la forme, fiscalité, régime social, rémunération.";

export const BOUTON_CONSULTATION = "Réserver ma consultation";

export const MENTION_CONSULTATION = `Paiement sécurisé à la réservation. Consultation réalisée par le cabinet d'expertise comptable dans le cadre d'une mission (art. 22, ord. n° 45-2138). Une facture vous est adressée par le cabinet. Après réservation, votre interlocuteur : ${EMAIL_CONTACT}.`;

/** Ligne différenciant les deux portes d'entrée vers le professionnel. */
export const DIFFERENCE_RELECTURE_CONSULTATION =
  "La relecture porte sur vos statuts rédigés ; la consultation répond à toutes vos questions avant de vous lancer.";

export const BOUTON_CONSULTATION_HEURE = "Réserver une consultation d'une heure";

/** Numéro de demande lisible, communiqué au client à l'écran. */
export function referenceDemande(date = new Date()) {
  const jour = date.toISOString().slice(0, 10).replace(/-/g, "");
  const alea = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CTC-${jour}-${alea}`;
}

export type CategorieContact = "amelioration" | "bug" | "dossier" | "paiement" | "autre";

export const CATEGORIES_CONTACT: {
  cle: CategorieContact;
  libelle: string;
  /** Préfixe d'objet de l'email ; absent = aucun envoi. */
  prefixe?: string;
}[] = [
  { cle: "amelioration", libelle: "Suggérer une amélioration ou une fonctionnalité", prefixe: "[AMÉLIORATION]" },
  {
    cle: "bug",
    libelle: "Signaler un bug ou un problème technique",
    prefixe: "[BUG]",
  },
  { cle: "dossier", libelle: "Mon dossier de création en cours", prefixe: "[DOSSIER]" },
  {
    cle: "paiement",
    libelle: "Une question sur un paiement ou une prestation déjà réglée",
    prefixe: "[PAIEMENT]",
  },
  { cle: "autre", libelle: "Autre demande / demander un avis" },
];

/** Les catégories qui déclenchent un envoi d'email vers le cabinet. */
export const CATEGORIES_AVEC_ENVOI: CategorieContact[] = CATEGORIES_CONTACT.filter(
  (c) => Boolean(c.prefixe),
).map((c) => c.cle);

export function declencheEnvoi(categorie: CategorieContact) {
  return CATEGORIES_AVEC_ENVOI.includes(categorie);
}

/** Objet de l'email transmis au cabinet. */
export function objetEmailContact(categorie: CategorieContact, dossierId?: string | null) {
  const def = CATEGORIES_CONTACT.find((c) => c.cle === categorie);
  if (!def?.prefixe) return null;
  const prefixe =
    categorie === "dossier" && dossierId ? `[DOSSIER ${dossierId}]` : def.prefixe;
  return `${prefixe} ${def.libelle}`;
}
