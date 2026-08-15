/**
 * Mode test de bout en bout.
 *
 * Un compte dont l'adresse contient le motif `+test` est un compte de test :
 * ses dossiers sont créés avec `est_test = true`, ses emails sont préfixés et
 * n'atteignent jamais d'autre destinataire que l'adresse du compte de test.
 * Ce module est volontairement pur (aucun accès réseau) pour rester testable.
 */

/** Motif reconnu dans l'adresse d'un compte de test (alias Gmail « +test »). */
export const MOTIF_EMAIL_TEST = "+test";

export const PREFIXE_TEST = "[TEST]";
export const PREFIXE_TEST_CABINET = "[TEST][CABINET]";

export const BANNIERE_TEST = "DOSSIER DE TEST — données factices, exclues des statistiques";
export const BADGE_TEST = "TEST";

export const LIBELLE_DOCUMENTS_PLUS_TARD = "Je déposerai les documents plus tard (mode test)";

/** Une adresse de compte de test contient le motif `+test`. */
export function estEmailTest(email?: string | null): boolean {
  return typeof email === "string" && email.toLowerCase().includes(MOTIF_EMAIL_TEST);
}

type DossierTest = { est_test?: boolean | null; documents_plus_tard?: boolean | null };

export function estDossierTest(dossier?: DossierTest | null): boolean {
  return dossier?.est_test === true;
}

/** Le verrou de complétude des pièces n'est levé que sur un dossier de test. */
export function piecesFacultatives(dossier?: DossierTest | null): boolean {
  return estDossierTest(dossier) && dossier?.documents_plus_tard === true;
}

/** Les dossiers de test sortent des compteurs et statistiques du cabinet. */
export function exclureDossiersTest<T extends DossierTest>(dossiers: T[]): T[] {
  return dossiers.filter((d) => !estDossierTest(d));
}

/**
 * Applique les règles d'envoi propres aux dossiers de test : objet préfixé et
 * destinataire forcé sur l'adresse du compte de test.
 */
export function preparerEnvoiTest(params: {
  sujet: string;
  destinataire: string;
  estTest: boolean;
  /** Adresse du compte de test propriétaire du dossier. */
  emailTest?: string | null;
  /** Vrai lorsque le message est une copie destinée au cabinet. */
  pourCabinet?: boolean;
}): { sujet: string; destinataire: string } {
  const { sujet, destinataire, estTest, emailTest, pourCabinet } = params;
  if (!estTest) return { sujet, destinataire };
  const prefixe = pourCabinet ? PREFIXE_TEST_CABINET : PREFIXE_TEST;
  return {
    sujet: sujet.startsWith(prefixe) ? sujet : `${prefixe} ${sujet}`,
    destinataire: emailTest || destinataire,
  };
}
