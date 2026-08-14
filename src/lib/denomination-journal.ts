/**
 * Historique des vérifications de dénomination d'un dossier : nom testé,
 * niveau de risque constaté, termes réglementés détectés et état de la revue
 * cabinet qui en découle. Purement informatif, jamais bloquant.
 */

import { horodatageFr, journaliser, lireEvenements, type EvenementJournal } from "./journal";
import { revueSystematique, type NiveauRisqueDenomination } from "./denomination";

export const TYPE_VERIF_DENOMINATION = "denomination_verifiee";

export const LIBELLE_RISQUE: Record<NiveauRisqueDenomination, string> = {
  aucun: "Aucun homonyme",
  eloigne: "Homonymes d'activité éloignée",
  proche: "Homonyme d'activité proche",
};

export type EtatRevue = "aucune" | "recommandee" | "systematique";

export const LIBELLE_REVUE: Record<EtatRevue, string> = {
  aucune: "Pas de revue particulière",
  recommandee: "Revue cabinet recommandée",
  systematique: "Revue cabinet systématique",
};

export type LigneDenomination = {
  date: string;
  denomination: string;
  risque: NiveauRisqueDenomination;
  termes: string[];
  revue: EtatRevue;
};

/** État de revue déduit du niveau de risque et des termes réglementés. */
export function etatRevue(risque: NiveauRisqueDenomination, termes: string[]): EtatRevue {
  if (revueSystematique(termes)) return "systematique";
  if (risque === "proche" || termes.length > 0) return "recommandee";
  return "aucune";
}

function encoder(l: Omit<LigneDenomination, "date" | "revue">) {
  return JSON.stringify({
    denomination: l.denomination,
    risque: l.risque,
    termes: l.termes,
  });
}

/** Consigne une vérification de dénomination au journal du dossier. */
export async function journaliserVerificationDenomination(
  dossierId: string,
  denomination: string,
  risque: NiveauRisqueDenomination,
  termes: string[],
) {
  await journaliser(dossierId, TYPE_VERIF_DENOMINATION, encoder({ denomination, risque, termes }));
}

/** Convertit les événements bruts en lignes d'historique lisibles. */
export function lignesDenomination(evenements: EvenementJournal[]): LigneDenomination[] {
  const out: LigneDenomination[] = [];
  for (const e of evenements) {
    try {
      const brut = JSON.parse(e.message) as {
        denomination?: string;
        risque?: NiveauRisqueDenomination;
        termes?: string[];
      };
      const risque = brut.risque ?? "aucun";
      const termes = brut.termes ?? [];
      out.push({
        date: e.created_at,
        denomination: brut.denomination ?? "",
        risque,
        termes,
        revue: etatRevue(risque, termes),
      });
    } catch {
      /* une ligne illisible n'empêche jamais l'affichage des autres */
    }
  }
  return out;
}

/** Historique des vérifications, du plus récent au plus ancien. */
export async function historiqueDenomination(dossierId: string, limite = 50) {
  return lignesDenomination(await lireEvenements(dossierId, [TYPE_VERIF_DENOMINATION], limite));
}

/** Échappement CSV : guillemets doublés, champ toujours encadré. */
function cellule(valeur: string) {
  return `"${valeur.replace(/"/g, '""')}"`;
}

/**
 * Journal des vérifications de dénomination au format CSV (séparateur
 * point-virgule, BOM UTF-8 pour une ouverture correcte dans un tableur français).
 */
export function journalDenominationCsv(titre: string, lignes: LigneDenomination[]) {
  const entete = [
    "Horodatage",
    "Horodatage ISO",
    "Dossier",
    "Dénomination testée",
    "Niveau de risque",
    "Termes réglementés",
    "État de revue cabinet",
  ];
  const corps = lignes.map((l) =>
    [
      horodatageFr(l.date),
      l.date,
      titre,
      l.denomination,
      LIBELLE_RISQUE[l.risque],
      l.termes.join(" | "),
      LIBELLE_REVUE[l.revue],
    ]
      .map(cellule)
      .join(";"),
  );
  const enTete = [
    cellule(`Vérifications de dénomination — ${titre || "dossier"}`),
    cellule(`Export du ${horodatageFr(new Date().toISOString())}`),
    cellule("Information de risque — une homonymie n'empêche jamais l'immatriculation."),
  ].join(";");
  return `\uFEFF${enTete}\n${entete.map(cellule).join(";")}\n${corps.join("\n")}\n`;
}

/** Déclenche le téléchargement du journal des vérifications de dénomination. */
export function telechargerJournalDenomination(titre: string, lignes: LigneDenomination[]) {
  const blob = new Blob([journalDenominationCsv(titre, lignes)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Vérifications de dénomination — ${titre || "dossier"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
