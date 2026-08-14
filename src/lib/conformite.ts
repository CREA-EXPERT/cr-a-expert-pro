/**
 * Lecture et mise en forme du journal de conformité des statuts :
 * historique des régénérations, motifs de refus et export horodaté.
 */

import { supabase } from "@/integrations/supabase/client";
import { horodatageFr, type EvenementJournal } from "./journal";

export const TYPE_BLOQUEE = "statuts_generation_bloquee";
export const TYPE_REUSSIE = "statuts_generation_reussie";
export const TYPES_CONFORMITE = [TYPE_BLOQUEE, TYPE_REUSSIE];

export type LigneConformite = {
  date: string;
  conforme: boolean;
  /** Message brut consigné. */
  message: string;
  /** Motifs de refus isolés, vide lorsque la génération a abouti. */
  motifs: string[];
};

/** Isole les motifs de refus d'un message de blocage. */
export function motifsDuMessage(message: string): string[] {
  const separateur = message.indexOf(" : ");
  if (separateur < 0) return [message];
  return message
    .slice(separateur + 3)
    .replace(/\.$/, "")
    .split(" ; ")
    .map((m) => m.trim())
    .filter(Boolean);
}

/** Convertit les événements bruts en lignes d'historique exploitables. */
export function lignesConformite(evenements: EvenementJournal[]): LigneConformite[] {
  return evenements.map((e) => ({
    date: e.created_at,
    conforme: e.type_event === TYPE_REUSSIE,
    message: e.message,
    motifs: e.type_event === TYPE_REUSSIE ? [] : motifsDuMessage(e.message),
  }));
}

/** Historique complet des tentatives de génération pour un dossier. */
export async function historiqueConformite(
  dossierId: string,
  limite = 200,
): Promise<LigneConformite[]> {
  const { data } = await supabase
    .from("events_dossier")
    .select("type_event, message, created_at")
    .eq("dossier_id", dossierId)
    .in("type_event", TYPES_CONFORMITE)
    .order("created_at", { ascending: false })
    .limit(limite);
  return lignesConformite((data ?? []) as EvenementJournal[]);
}

/** Échappement CSV : guillemets doublés, champ toujours encadré. */
function cellule(valeur: string) {
  return `"${valeur.replace(/"/g, '""')}"`;
}

/**
 * Journal de conformité au format CSV (séparateur point-virgule, BOM UTF-8
 * pour une ouverture correcte dans un tableur français).
 */
export function journalCsv(denomination: string, lignes: LigneConformite[]) {
  const entete = [
    "Horodatage",
    "Horodatage ISO",
    "Résultat",
    "Nombre de motifs",
    "Motifs de refus",
  ];
  const corps = lignes.map((l) =>
    [
      horodatageFr(l.date),
      l.date,
      l.conforme ? "Généré" : "Refusé",
      String(l.motifs.length),
      l.motifs.join(" | "),
    ]
      .map(cellule)
      .join(";"),
  );
  const enTeteDossier = [
    cellule(`Journal de conformité — ${denomination || "dossier"}`),
    cellule(`Export du ${horodatageFr(new Date().toISOString())}`),
  ].join(";");
  return `\uFEFF${enTeteDossier}\n${entete.map(cellule).join(";")}\n${corps.join("\n")}\n`;
}

/** Déclenche le téléchargement du journal au format CSV. */
export function telechargerJournal(denomination: string, lignes: LigneConformite[]) {
  const blob = new Blob([journalCsv(denomination, lignes)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Journal de conformité — ${denomination || "dossier"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
