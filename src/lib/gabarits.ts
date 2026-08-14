/**
 * Versions des gabarits de statuts et date d'application des règles de
 * conformité. Ces repères sont inscrits dans les métadonnées de chaque PDF
 * généré, afin de savoir sous quel jeu de règles un document a été produit.
 */

import type { Gabarit } from "./statuts-clauses";

/** Version éditoriale de chaque gabarit de statuts. */
export const VERSIONS_GABARIT: Record<Gabarit, string> = {
  SAS: "SAS-2026.1",
  SARL: "SARL-2026.1",
  EURL: "EURL-2026.1",
  SCI: "SCI-2026.1",
};

/** Version du moteur documentaire (documents hors statuts compris). */
export const VERSION_MOTEUR = "2026.1";

/**
 * Date d'entrée en vigueur du jeu de règles de conformité appliqué
 * (clauses obligatoires, contrôles de chronologie, mentions légales).
 */
export const DATE_REGLES_CONFORMITE = "2026-01-01";

/** Libellé lisible de la version appliquée, pour l'affichage et le journal. */
export function libelleVersion(gabarit: Gabarit | null) {
  const version = gabarit ? VERSIONS_GABARIT[gabarit] : `MOTEUR-${VERSION_MOTEUR}`;
  return `${version} — règles de conformité du ${new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(DATE_REGLES_CONFORMITE))}`;
}
