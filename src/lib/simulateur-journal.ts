/**
 * Journalisation probatoire des simulations : version des textes, réponses,
 * empreinte de la restitution générée. Aucune donnée sensible n'y figure.
 */

import { SIMULATEUR_TEXTES_VERSION } from "./simulateur-textes";

export type EntreeJournalSimulation = {
  version_textes: string;
  horodatage: string;
  email: string;
  reponses: Record<string, string>;
  forme_retenue: string;
  empreinte_restitution: string;
};

/** Empreinte stable et non réversible (djb2), suffisante pour prouver l'identité du texte servi. */
export function empreinte(texte: string): string {
  let h = 5381;
  for (let i = 0; i < texte.length; i++) h = ((h * 33) ^ texte.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

export function construireJournalSimulation({
  email,
  reponses,
  formeRetenue,
  restitutionTexte,
  horodatage,
}: {
  email: string;
  reponses: Record<string, string>;
  formeRetenue: string | null;
  restitutionTexte: string;
  horodatage?: string;
}): EntreeJournalSimulation {
  return {
    version_textes: SIMULATEUR_TEXTES_VERSION,
    horodatage: horodatage ?? new Date().toISOString(),
    email,
    reponses,
    forme_retenue: formeRetenue ?? "aucune",
    empreinte_restitution: empreinte(restitutionTexte),
  };
}
