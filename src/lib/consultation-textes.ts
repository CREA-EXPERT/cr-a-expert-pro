/**
 * Source unique des textes de la consultation avec un expert-comptable :
 * carte, page /contact, CGU et emails. Toute évolution passe par ce fichier
 * et par une nouvelle valeur de `CONSULTATION_TEXTES_VERSION`.
 */
import { EMAIL_CONTACT, LIBELLE_PRIX_CONSULTATION, PRIX_CONSULTATION, URL_CALENDLY_CONSULTATION } from "./contact";

export { LIBELLE_PRIX_CONSULTATION, PRIX_CONSULTATION, URL_CALENDLY_CONSULTATION };

/** Version des textes affichés, journalisée à chaque affichage de la carte. */
export const CONSULTATION_TEXTES_VERSION = "2026-08-15.2";

export const CONSULTATION_TITRE = "Besoin d'un avis sur votre situation ?";

/** Durée indicative — jamais exprimée en minutes. */
export const CONSULTATION_DUREE =
  "Consultation d'1 heure avec un expert-comptable (durée indicative).";

/** Texte affiché sous le bouton de réservation, quand le libellé est placé sous le bouton. */
export const CONSULTATION_SOUS_BOUTON =
  "Consultation d' 1h avec un expert-comptable (durée indicative). 148,80 € TTC ( TVA 20 %). La durée est indicative, on traite le problème jusqu'au bout.";


export const CONSULTATION_ENGAGEMENT =
  "Si votre question demande plus de temps, l'expert-comptable poursuit la consultation sans supplément, jusqu'à la traiter complètement.";

export const CONSULTATION_GARANTIE =
  "Si nous ne pouvons pas vous apporter de réponse utile, la consultation vous est intégralement remboursée.";

export const CONSULTATION_CANAL =
  "Par téléphone, en visioconférence ou par email, au choix. Vous posez toutes vos questions : choix de la forme, fiscalité, régime social, rémunération.";

export const CONSULTATION_INTRO =
  "Réservez une consultation avec un expert-comptable du cabinet, inscrit à l'Ordre des experts-comptables.";

export const CONSULTATION_BOUTON = "Réserver ma consultation";

export const CONSULTATION_BOUTON_ARIA =
  "Réserver ma consultation d'1 heure avec un expert-comptable (nouvelle fenêtre)";

/** Libellé de prix affiché à proximité immédiate du bouton. */
export const CONSULTATION_PRIX = `${PRIX_CONSULTATION.ttc} TTC (${PRIX_CONSULTATION.ht} HT, ${PRIX_CONSULTATION.tva}) — 1 heure`;

/** Points de réassurance affichés sous le prix et repris dans les emails. */
export const CONSULTATION_REASSURANCE = [
  {
    cle: "duree",
    texte: "Pas de chronomètre : l'heure est indicative, on ne raccroche pas à l'heure pile.",
  },
  {
    cle: "traitement",
    texte: "Nous traitons vos questions jusqu'au bout, sans supplément.",
  },
] as const;

export const CONSULTATION_MENTION = `Paiement sécurisé à la réservation. Consultation réalisée par le cabinet d'expertise comptable dans le cadre d'une mission (art. 22, ord. n° 45-2138). Une facture vous est adressée par le cabinet. Après réservation, votre interlocuteur : ${EMAIL_CONTACT}.`;

/** Pied de page des emails mentionnant la consultation. */
export function piedVersionTextes() {
  return `Textes de la consultation — version ${CONSULTATION_TEXTES_VERSION}.`;
}

/** Bloc réassurance en texte simple, repris dans les emails de confirmation. */
export function reassuranceTexteBrut() {
  return CONSULTATION_REASSURANCE.map((p) => `• ${p.texte}`).join("\n");
}
