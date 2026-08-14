/**
 * Lecture et mise en forme du journal de conformité des statuts :
 * historique des régénérations, motifs de refus et export horodaté.
 */

import { supabase } from "@/integrations/supabase/client";
import { horodatageFr, journaliser, type EvenementJournal } from "./journal";
import { VERSIONS_GABARIT } from "./gabarits";
import type { Gabarit } from "./statuts-clauses";

export const TYPE_BLOQUEE = "statuts_generation_bloquee";
export const TYPE_REUSSIE = "statuts_generation_reussie";
export const TYPE_EXPORT = "journal_conformite_exporte";
export const TYPES_CONFORMITE = [TYPE_BLOQUEE, TYPE_REUSSIE];

export type MetaEvenement = {
  gabarit?: string | undefined;
  version?: string | undefined;
  auteur?: string | undefined;
};

export type LigneConformite = {
  date: string;
  conforme: boolean;
  /** Message brut consigné, débarrassé de ses métadonnées techniques. */
  message: string;
  /** Motifs de refus isolés, vide lorsque la génération a abouti. */
  motifs: string[];
  /** Gabarit appliqué (SAS, SARL, EURL, SCI) lorsqu'il est connu. */
  gabarit: string;
  /** Version éditoriale du gabarit au moment de l'événement. */
  version: string;
  /** Utilisateur à l'origine de l'événement. */
  auteur: string;
  /** Dossier concerné, renseigné pour les exports multi-dossiers. */
  dossierId?: string | undefined;
  denomination?: string | undefined;
};

/** Suffixe technique ajouté au message journalisé (gabarit, version, auteur). */
export function suffixeMeta(meta: MetaEvenement): string {
  const parties = [
    meta.gabarit ? `gabarit=${meta.gabarit}` : null,
    meta.version ? `version=${meta.version}` : null,
    meta.auteur ? `auteur=${meta.auteur}` : null,
  ].filter(Boolean);
  return parties.length === 0 ? "" : ` [${parties.join("; ")}]`;
}

/** Sépare le message lisible de ses métadonnées techniques. */
export function extraireMeta(brut: string): { message: string; meta: MetaEvenement } {
  const correspondance = brut.match(/\s\[([^[\]]*=[^[\]]*)\]\s*$/);
  if (!correspondance) return { message: brut, meta: {} };
  const meta: MetaEvenement = {};
  for (const morceau of correspondance[1]!.split(";")) {
    const [cle, ...reste] = morceau.split("=");
    const valeur = reste.join("=").trim();
    const nom = (cle ?? "").trim();
    if (nom === "gabarit") meta.gabarit = valeur;
    if (nom === "version") meta.version = valeur;
    if (nom === "auteur") meta.auteur = valeur;
  }
  return { message: brut.slice(0, correspondance.index).trimEnd(), meta };
}

/** Version éditoriale associée à un gabarit connu. */
export function versionGabarit(gabarit: Gabarit | string | null | undefined) {
  if (!gabarit) return "";
  return VERSIONS_GABARIT[gabarit as Gabarit] ?? "";
}

/**
 * Consigne un événement de conformité en y joignant le gabarit, sa version et
 * l'utilisateur à l'origine de l'action.
 */
export async function journaliserConformite(
  dossierId: string,
  type: string,
  message: string,
  gabarit?: Gabarit | string | null,
): Promise<string> {
  let auteur = "";
  try {
    const { data } = await supabase.auth.getUser();
    auteur = data.user?.email ?? data.user?.id ?? "";
  } catch {
    /* l'identité de l'auteur est un confort de traçabilité */
  }
  const complet =
    message +
    suffixeMeta({
      gabarit: gabarit ?? undefined,
      version: versionGabarit(gabarit),
      auteur,
    });
  await journaliser(dossierId, type, complet);
  return complet;
}

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
export function lignesConformite(
  evenements: (EvenementJournal & { dossier_id?: string })[],
  contexte?: (dossierId: string | undefined) => { denomination?: string } | undefined,
): LigneConformite[] {
  return evenements.map((e) => {
    const { message, meta } = extraireMeta(e.message);
    const conforme = e.type_event === TYPE_REUSSIE;
    return {
      date: e.created_at,
      conforme,
      message,
      motifs: conforme ? [] : motifsDuMessage(message),
      gabarit: meta.gabarit ?? "",
      version: meta.version ?? versionGabarit(meta.gabarit),
      auteur: meta.auteur ?? "",
      dossierId: e.dossier_id,
      denomination: contexte?.(e.dossier_id)?.denomination,
    };
  });
}

/** Historique complet des tentatives de génération pour un dossier. */
export async function historiqueConformite(
  dossierId: string,
  limite = 200,
): Promise<LigneConformite[]> {
  const { data, error } = await supabase
    .from("events_dossier")
    .select("type_event, message, created_at")
    .eq("dossier_id", dossierId)
    .in("type_event", TYPES_CONFORMITE)
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return lignesConformite((data ?? []) as EvenementJournal[]);
}

/**
 * Motif de blocage récurrent : premier motif apparaissant dans au moins
 * `seuil` événements de refus du dossier. `null` s'il n'y en a aucun.
 */
export function motifRecurrent(lignes: LigneConformite[], seuil = 2): string | null {
  const comptes = new Map<string, number>();
  for (const l of lignes) {
    if (l.conforme) continue;
    for (const m of new Set(l.motifs)) comptes.set(m, (comptes.get(m) ?? 0) + 1);
  }
  let meilleur: { motif: string; nb: number } | null = null;
  for (const [motif, nb] of comptes) {
    if (nb >= seuil && (!meilleur || nb > meilleur.nb)) meilleur = { motif, nb };
  }
  return meilleur?.motif ?? null;
}

/** Échappement CSV : guillemets doublés, champ toujours encadré. */
function cellule(valeur: string) {
  return `"${valeur.replace(/"/g, '""')}"`;
}

/**
 * Journal de conformité au format CSV (séparateur point-virgule, BOM UTF-8
 * pour une ouverture correcte dans un tableur français).
 */
export function journalCsv(titre: string, lignes: LigneConformite[]) {
  const entete = [
    "Horodatage",
    "Horodatage ISO",
    "Dossier",
    "Identifiant du dossier",
    "Utilisateur",
    "Gabarit",
    "Version du gabarit",
    "Résultat",
    "Nombre de motifs",
    "Motifs de refus",
  ];
  const corps = lignes.map((l) =>
    [
      horodatageFr(l.date),
      l.date,
      l.denomination ?? titre,
      l.dossierId ?? "",
      l.auteur,
      l.gabarit,
      l.version,
      l.conforme ? "Généré" : "Refusé",
      String(l.motifs.length),
      l.motifs.join(" | "),
    ]
      .map(cellule)
      .join(";"),
  );
  const enTeteDossier = [
    cellule(`Journal de conformité — ${titre || "dossier"}`),
    cellule(`Export du ${horodatageFr(new Date().toISOString())}`),
  ].join(";");
  return `\uFEFF${enTeteDossier}\n${entete.map(cellule).join(";")}\n${corps.join("\n")}\n`;
}

/** Déclenche le téléchargement du journal au format CSV. */
export function telechargerJournal(titre: string, lignes: LigneConformite[]) {
  const blob = new Blob([journalCsv(titre, lignes)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Journal de conformité — ${titre || "dossier"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Téléchargement d'un export, consigné au journal des dossiers concernés
 * (qui, quand, quel périmètre).
 */
export async function exporterJournal(
  titre: string,
  lignes: LigneConformite[],
  perimetre: string,
  dossiers: string[],
) {
  telechargerJournal(titre, lignes);
  const cibles = [...new Set(dossiers)].slice(0, 50);
  await Promise.all(
    cibles.map((id) =>
      journaliserConformite(
        id,
        TYPE_EXPORT,
        `Journal de conformité exporté — ${perimetre} (${lignes.length} événement${
          lignes.length > 1 ? "s" : ""
        }).`,
      ),
    ),
  );
}
