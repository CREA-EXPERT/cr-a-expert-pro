import type { Tables } from "@/integrations/supabase/types";
import { activitesDuDossier, activitesReglementees, libelleActivite } from "./activites";
import { isEI, isSas, REGIMES_COMMUNAUTAIRES, FORMES_COMMUNAUTE, type Forme } from "./domain";

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

/**
 * Régime comportant une masse commune. Un régime étranger n'est plus présumé
 * séparatiste : la réponse déclarée par l'associé fait foi.
 */
export function estCommunautaire(a: Associe) {
  if (a.type !== "personne_physique" || a.situation_matrimoniale !== "marie") return false;
  if (a.regime_matrimonial === "regime_etranger")
    return a.regime_etranger_communautaire === "oui";
  return REGIMES_COMMUNAUTAIRES.includes(a.regime_matrimonial ?? "");
}

/** Régime étranger dont le caractère communautaire n'est pas déterminé. */
export function regimeEtrangerIndetermine(a: Associe) {
  return (
    a.type === "personne_physique" &&
    a.situation_matrimoniale === "marie" &&
    a.regime_matrimonial === "regime_etranger" &&
    (a.regime_etranger_communautaire ?? "") !== "oui" &&
    (a.regime_etranger_communautaire ?? "") !== "non"
  );
}

export function conjointConcerne(dossier: Dossier, a: Associe) {
  return (
    estCommunautaire(a) &&
    a.apport_fonds_communs === true &&
    FORMES_COMMUNAUTE.includes(dossier.forme_juridique as Forme)
  );
}

/**
 * Partenaire de PACS co-indivisaire : son consentement à l'apport de fonds
 * indivis est requis (art. 815-3 C. civ.), quelle que soit la forme sociale.
 * L'article 1832-2, propre aux époux, ne s'applique pas.
 */
export function partenaireIndivisConcerne(a: Associe) {
  return (
    a.type === "personne_physique" &&
    a.situation_matrimoniale === "pacse" &&
    a.regime_matrimonial === "indivision_pacs" &&
    a.apport_fonds_communs === true
  );
}

/** Le dossier comporte-t-il un apport en nature soumis à cogestion ? */
export function apportCogestion(dossier: Dossier) {
  return dossier.fonds_commerce === "apport" || dossier.apport_immeuble === true;
}

/**
 * Consentement du conjoint à l'apport d'un bien commun (art. 1424 C. civ.),
 * exigé pour toutes les formes, y compris les SAS et SASU.
 */
export function consentement1424(dossier: Dossier, associes: Associe[]) {
  const apporteurs = associes.filter((a) => estCommunautaire(a));
  const applicable = apportCogestion(dossier) && apporteurs.length > 0;
  return {
    applicable,
    requis: applicable && dossier.bien_commun_apport === "oui",
    doute: applicable && dossier.bien_commun_apport === "je_ne_sais_pas",
    apporteurs,
  };
}

/** Points qui imposent la revue d'un professionnel avant dépôt. */
export function revuesHumaines(dossier: Dossier, associes: Associe[]): string[] {
  const out: string[] = [];
  if (consentement1424(dossier, associes).doute)
    out.push(
      "La nature commune ou propre du bien apporté n'est pas déterminée : un professionnel doit qualifier le bien avant la signature des statuts.",
    );
  for (const a of associes.filter(regimeEtrangerIndetermine))
    out.push(
      `Le régime matrimonial étranger de ${a.prenom ?? ""} ${a.nom ?? ""}`.trim() +
        " n'est pas qualifié : un professionnel doit déterminer s'il comporte une masse commune.",
    );
  for (const a of associes.filter((p) => conjointConcerne(dossier, p) && p.conjoint_revendique))
    out.push(
      `Le conjoint de ${`${a.prenom ?? ""} ${a.nom ?? ""}`.trim()} revendique la qualité d'associé pour la moitié des parts (art. 1832-2 C. civ.) : la répartition du capital et la liste des associés doivent être validées par le cabinet.`,
    );
  for (const a of associes.filter((p) => p.type === "personne_morale"))
    out.push(
      `Associé personne morale (${a.denomination ?? "dénomination à préciser"}) : la détention indirecte doit être vérifiée pour le registre des bénéficiaires effectifs.`,
    );
  return out;
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

  const ei = isEI(dossier.forme_juridique);
  /** L'entreprise individuelle n'a ni statuts, ni capital, ni annonce légale, ni bénéficiaires effectifs. */
  const TYPES_HORS_EI = [
    "statuts",
    "liste_souscripteurs",
    "depot_fonds",
    "parution_annonce",
    "beneficiaires_effectifs",
    "non_condamnation",
    "kbis_associe",
    "statuts_associe",
    "decision_souscription",
    "courrier_conjoint",
    "renonciation_conjoint",
  ];

  const physiques = associes.filter((a) => a.type === "personne_physique");
  const morales = associes.filter((a) => a.type === "personne_morale");
  const dirigeants = associes.filter((a) => a.est_dirigeant && a.type === "personne_physique");

  for (const r of [...rules].sort((a, b) => a.ordre - b.ordre)) {
    if (r.condition_champ === "forme_EI") {
      if (ei) out.push(base(r, null));
      continue;
    }
    if (ei && TYPES_HORS_EI.includes(r.type_document)) continue;
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
      case "activite_reglementee": {
        // Une pièce par activité réglementée, libellée avec l'intitulé de l'activité.
        const reglementees = activitesReglementees(activitesDuDossier(dossier));
        if (reglementees.length > 0)
          reglementees.forEach((a, i) => out.push(base(r, null, libelleActivite(a, i))));
        else if (dossier.activite_reglementee) out.push(base(r, null));
        break;
      }
      case "forme_sas":
        if (!ei && isSas(dossier.forme_juridique)) out.push(base(r, null));
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
  if (isEI(dossier.forme_juridique)) return erreurs;
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

export type Chronologie = { erreurs: string[]; avertissements: string[] };

/**
 * Contrôle complet de la chronologie des actes, au récapitulatif final.
 * Les écarts d'ancienneté ne bloquent pas : ils avertissent.
 */
export function controlerChronologie(dossier: Dossier, associes: Associe[]): Chronologie {
  const erreurs = verifierDates(dossier);
  const avertissements: string[] = [];
  const sig = dossier.date_signature ? new Date(dossier.date_signature) : null;
  const consentements = dossier.date_consentements ? new Date(dossier.date_consentements) : null;

  const consentementAttendu =
    associes.some((a) => conjointConcerne(dossier, a) || partenaireIndivisConcerne(a)) ||
    consentement1424(dossier, associes).requis;

  if (consentementAttendu) {
    if (!consentements)
      erreurs.push(
        "La date de signature des courriers et consentements du conjoint ou du partenaire n'est pas renseignée.",
      );
    else if (sig && consentements > sig)
      erreurs.push(
        "Les courriers et consentements du conjoint ou du partenaire doivent être signés avant la signature des statuts, ou le même jour.",
      );
  }

  if (sig) {
    const jours = Math.floor((Date.now() - sig.getTime()) / 86_400_000);
    if (jours > 30)
      avertissements.push(
        "Des documents anciens peuvent conduire le greffe à demander des pièces actualisées.",
      );
  }
  return { erreurs, avertissements };
}
