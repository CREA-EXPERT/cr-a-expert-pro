/**
 * Source unique des informations légales de l'éditeur.
 * Toutes les pages légales (mentions légales, CGU, politique de confidentialité)
 * lisent exclusivement cet objet : aucune information légale n'est écrite en dur
 * ailleurs dans l'application.
 *
 * Tant qu'une valeur contient « [À COMPLÉTER », la publication du site est
 * interdite en l'état (art. 6, III de la loi n° 2004-575 du 21 juin 2004).
 */

const A_COMPLETER = "[À COMPLÉTER PAR L'ÉDITEUR]";

export const EDITEUR = {
  denomination: "CREA EXPERT",
  formeJuridique: "SASU",
  capital: A_COMPLETER,
  siren: A_COMPLETER,
  rcs: A_COMPLETER,
  tvaIntracommunautaire: A_COMPLETER,
  siegeAdresse: "138 Avenue Victor Hugo, 75016 Paris",
  directeurPublication: A_COMPLETER,
  emailContact: A_COMPLETER,
  telephone: A_COMPLETER,
  hebergeur: {
    nom: A_COMPLETER,
    adresse: A_COMPLETER,
  },
  cabinetPartenaire: {
    nom: "ODEON (SAS)",
    inscriptionOrdre: "Inscription en cours au tableau de l'Ordre des experts-comptables de Paris",
    adresse: "138 Avenue Victor Hugo, 75016 Paris",
    assuranceRcp: A_COMPLETER,
  },
  delegueProtectionDonnees: {
    email: A_COMPLETER,
  },
  mediateurConsommation: A_COMPLETER,
} as const;

/** Liste des chemins encore non renseignés dans EDITEUR. */
export function champsIncomplets(objet: unknown = EDITEUR, prefixe = ""): string[] {
  if (typeof objet === "string") {
    return objet.includes("[À COMPLÉTER") ? [prefixe] : [];
  }
  if (objet && typeof objet === "object") {
    return Object.entries(objet as Record<string, unknown>).flatMap(([k, v]) =>
      champsIncomplets(v, prefixe ? `${prefixe}.${k}` : k),
    );
  }
  return [];
}

export function mentionsLegalesCompletes() {
  return champsIncomplets().length === 0;
}

/** Libellé unique de la mention d'autorité, à réutiliser sur tous les écrans. */
export const LIBELLE_DIPLOMES = "Réalisé par un cabinet d'expertise comptable français";
