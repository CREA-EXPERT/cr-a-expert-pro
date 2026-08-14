/**
 * Analyse informative de la dénomination sociale.
 *
 * Principe : le choix de la dénomination est libre (art. L. 210-2 C. com.).
 * Ni le greffe ni le guichet unique ne contrôlent la disponibilité du nom :
 * une homonymie n'est jamais un motif de rejet. Ce module ne produit donc
 * que des informations de risque, jamais un blocage.
 */

export type NiveauRisqueDenomination = "aucun" | "eloigne" | "proche";

export type EntrepriseHomonyme = {
  nom: string;
  siren: string;
  naf: string | null;
  naf_libelle?: string | null;
  commune: string | null;
};

/** Division NAF (deux premiers chiffres), qui approxime la proximité d'activité. */
export function divisionNaf(code: string | null | undefined) {
  if (!code) return null;
  const m = /^(\d{2})/.exec(code.trim());
  return m ? m[1] : null;
}

/**
 * Classe le résultat de la recherche d'homonymes en trois niveaux :
 * aucun homonyme, homonymes d'activités éloignées, homonymes d'activité
 * identique ou de la même division NAF que celle du dossier.
 */
export function classerHomonymes(
  homonymes: EntrepriseHomonyme[],
  codesDossier: (string | null | undefined)[],
): NiveauRisqueDenomination {
  if (homonymes.length === 0) return "aucun";
  const codes = codesDossier.filter(Boolean).map((c) => (c as string).trim().toUpperCase());
  const divisions = new Set(codes.map((c) => divisionNaf(c)).filter(Boolean) as string[]);
  if (divisions.size === 0) return "eloigne";
  const proche = homonymes.some((h) => {
    const code = (h.naf ?? "").trim().toUpperCase();
    if (!code) return false;
    if (codes.includes(code)) return true;
    const d = divisionNaf(code);
    return d !== null && divisions.has(d);
  });
  return proche ? "proche" : "eloigne";
}

export const TERMES_REGLEMENTES = [
  "expert-comptable",
  "commissaire aux comptes",
  "banque",
  "crédit",
  "assurance",
  "mutuelle",
  "notaire",
  "avocat",
  "huissier",
  "pharmacie",
  "ordre",
] as const;

/** Termes dont l'emploi est systématiquement soumis à la revue du cabinet. */
export const TERMES_REVUE_SYSTEMATIQUE = ["expert-comptable", "commissaire aux comptes"] as const;

function normaliser(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Termes réservés ou réglementés détectés dans la dénomination saisie. */
export function termesReglementesDetectes(denomination: string): string[] {
  const cible = ` ${normaliser(denomination ?? "")} `;
  return TERMES_REGLEMENTES.filter((t) => cible.includes(` ${normaliser(t)} `));
}

/** Le terme détecté impose-t-il une revue systématique du cabinet ? */
export function revueSystematique(termes: string[]) {
  return termes.some((t) => (TERMES_REVUE_SYSTEMATIQUE as readonly string[]).includes(t));
}

export const MESSAGE_RISQUE_PROCHE =
  "Une ou plusieurs entreprises exercent une activité proche sous la même dénomination : " +
  "l'immatriculation n'est pas menacée, mais un concurrent pourrait agir (concurrence déloyale, " +
  "art. 1240 C. civ. ; contrefaçon de marque, art. L. 713-2 et L. 713-3 CPI). Une relecture de la " +
  "dénomination par l'expert-comptable est recommandée.";

export function messageTermesReglementes(termes: string[]) {
  return (
    `Dénomination comportant un terme réservé ou réglementé (${termes.join(", ")}) : ` +
    "son emploi est soumis à la revue du cabinet."
  );
}

/**
 * Points de revue humaine liés à la dénomination. Jamais bloquants :
 * aucun motif de dénomination ne peut empêcher la génération des statuts
 * ni la transmission du dossier.
 */
export function revuesDenomination(
  denomination: string | null | undefined,
  risque: string | null | undefined,
): string[] {
  const out: string[] = [];
  const termes = termesReglementesDetectes(denomination ?? "");
  if (termes.length > 0) out.push(messageTermesReglementes(termes));
  if (risque === "proche") out.push(MESSAGE_RISQUE_PROCHE);
  return out;
}
