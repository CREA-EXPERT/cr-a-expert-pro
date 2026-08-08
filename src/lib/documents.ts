import type { Tables } from "@/integrations/supabase/types";
import { isSas, REGIMES_COMMUNAUTAIRES, FORMES_COMMUNAUTE, type Forme } from "./domain";

export type Dossier = Tables<"dossiers">;
export type Associe = Tables<"associes">;
export type DocumentRule = Tables<"document_rules">;
export type DocumentRow = Tables<"documents">;

export type DocumentDraft = {
  dossier_id: string;
  associe_id: string | null;
  type_document: string;
  libelle: string;
  aide_client: string | null;
  obligatoire: boolean;
  origine: string;
  statut_document: string;
};

function nomAssocie(a: Associe) {
  return a.type === "personne_morale"
    ? (a.denomination ?? "Personne morale")
    : `${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "Associé";
}

export function conjointConcerne(dossier: Dossier, a: Associe) {
  return (
    a.type === "personne_physique" &&
    a.situation_matrimoniale === "marie" &&
    REGIMES_COMMUNAUTAIRES.includes(a.regime_matrimonial ?? "") &&
    a.apport_fonds_communs === true &&
    FORMES_COMMUNAUTE.includes(dossier.forme_juridique as Forme)
  );
}

/** Construit la checklist documentaire d'un dossier à partir des règles éditables. */
export function construireDocuments(
  dossier: Dossier,
  associes: Associe[],
  rules: DocumentRule[],
): DocumentDraft[] {
  const out: DocumentDraft[] = [];
  const base = (r: DocumentRule, associeId: string | null, suffixe?: string): DocumentDraft => ({
    dossier_id: dossier.id,
    associe_id: associeId,
    type_document: r.type_document,
    libelle: suffixe ? `${r.libelle_client} — ${suffixe}` : r.libelle_client,
    aide_client: r.aide_client,
    obligatoire: r.obligatoire,
    origine: r.origine,
    statut_document: "a_fournir",
  });

  const physiques = associes.filter((a) => a.type === "personne_physique");
  const morales = associes.filter((a) => a.type === "personne_morale");
  const dirigeants = associes.filter((a) => a.est_dirigeant && a.type === "personne_physique");

  for (const r of [...rules].sort((a, b) => a.ordre - b.ordre)) {
    switch (r.condition_champ) {
      case "par_personne_physique":
        physiques.forEach((a) => out.push(base(r, a.id, nomAssocie(a))));
        break;
      case "par_dirigeant":
        dirigeants.forEach((a) => out.push(base(r, a.id, nomAssocie(a))));
        break;
      case "par_personne_morale":
        morales.forEach((a) => out.push(base(r, a.id, nomAssocie(a))));
        break;
      case "siege_type":
        if (dossier.siege_type === r.condition_valeur) out.push(base(r, null));
        break;
      case "conjoint_fonds_communs":
        physiques.filter((a) => conjointConcerne(dossier, a)).forEach((a) => out.push(base(r, a.id, nomAssocie(a))));
        break;
      case "forme_sas":
        if (isSas(dossier.forme_juridique)) out.push(base(r, null));
        break;
      case "toujours":
      default:
        out.push(base(r, null));
        break;
    }
  }
  return out;
}

/** Contrôle de cohérence bloquant sur l'ordre des dates. */
export function verifierDates(dossier: Dossier): string[] {
  const erreurs: string[] = [];
  const sig = dossier.date_signature ? new Date(dossier.date_signature) : null;
  const depot = dossier.date_depot_fonds ? new Date(dossier.date_depot_fonds) : null;
  const parution = dossier.date_parution ? new Date(dossier.date_parution) : null;
  if (!sig) erreurs.push("La date de signature des statuts n'est pas renseignée.");
  if (sig && depot && depot > sig)
    erreurs.push(
      "L'attestation de dépôt des fonds doit être antérieure ou du même jour que la signature des statuts.",
    );
  if (sig && parution && parution < sig)
    erreurs.push(
      "L'attestation de parution de l'annonce légale doit être postérieure ou du même jour que la signature des statuts.",
    );
  return erreurs;
}
