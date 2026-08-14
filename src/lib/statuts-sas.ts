/**
 * Gabarit SAS / SASU : règles d'accord, blocs de comparution et contrôles
 * bloquants préalables à la génération des statuts.
 */

import { dateEnLettresFr } from "./nombres";
import type { Associe, Dossier } from "./documents";
import { isSas } from "./domain";

export const feminin = (a: Associe | undefined | null) => a?.civilite === "Madame";
/** Marque d'accord « e » selon la civilité. */
export const accord = (a: Associe | undefined | null) => (feminin(a) ? "e" : "");

export function prenomsAssocie(a: Associe) {
  const liste = (a.prenoms ?? []).filter((p) => (p ?? "").trim().length > 0);
  if (liste.length > 0) return liste.join(" ");
  return (a.prenom ?? "").trim();
}

export function nomCompletPhysique(a: Associe) {
  return `${a.civilite ?? ""} ${prenomsAssocie(a)} ${a.nom ?? ""}`.replace(/\s+/g, " ").trim();
}

/** Libellé du régime matrimonial tel qu'il figure dans les actes. */
export const LIBELLE_REGIME: Record<string, string> = {
  communaute_legale:
    "de la communauté réduite aux acquêts à défaut de contrat de mariage préalable",
  communaute_universelle: "de la communauté universelle de biens",
  communaute_meubles_acquets: "de la communauté de meubles et acquêts",
  separation_biens: "de la séparation de biens",
  separation_societe_acquets: "de la séparation de biens avec société d'acquêts",
  participation_acquets: "de la participation aux acquêts",
  regime_etranger: "matrimonial étranger déclaré par l'intéressé",
};

function ligneSituation(a: Associe): string {
  const e = accord(a);
  switch (a.situation_matrimoniale) {
    case "marie": {
      const regime = LIBELLE_REGIME[a.regime_matrimonial ?? ""] ?? "matrimonial déclaré";
      return `Marié${e} le ${dateEnLettresFr(a.date_mariage)} à ${a.lieu_mariage ?? ""} avec ${
        a.conjoint_civilite ?? ""
      } ${a.conjoint_nom ?? ""}, sous le régime ${regime}, régime non modifié depuis ;`
        .replace(/\s+/g, " ")
        .trim();
    }
    case "pacse": {
      const regime =
        a.regime_matrimonial === "indivision_pacs" ? "l'indivision" : "la séparation de biens";
      return `Lié${e} par un pacte civil de solidarité conclu le ${dateEnLettresFr(
        a.date_pacs,
      )} avec ${a.conjoint_civilite ?? ""} ${a.conjoint_nom ?? ""}, sous le régime de ${regime} ;`
        .replace(/\s+/g, " ")
        .trim();
    }
    case "divorce":
      return `Divorcé${e} et non remarié${e} ;`;
    case "veuf":
      return feminin(a) ? "Veuve et non remariée ;" : "Veuf et non remarié ;";
    default:
      return "Célibataire ;";
  }
}

/** Bloc de comparution complet d'un associé, une entrée par ligne. */
export function comparution(a: Associe): string[] {
  if (a.type === "personne_morale") {
    return [
      `La société ${a.denomination ?? ""}, ${a.forme ?? ""} au capital de ${
        a.montant_apport ?? 0
      } euros, dont le siège social est situé ${a.siege ?? ""}, immatriculée au RCS sous le numéro ${
        a.siren ?? ""
      }, représentée par ${a.representant ?? ""}, dûment habilité à l'effet des présentes ;`,
    ];
  }
  const e = accord(a);
  return [
    nomCompletPhysique(a),
    `Demeurant ${a.adresse ?? ""} ;`,
    `Né${e} le ${dateEnLettresFr(a.date_naissance)} à ${a.lieu_naissance ?? ""} ;`,
    ligneSituation(a),
    `De nationalité ${a.nationalite ?? ""}`,
  ];
}

/** Bloc court utilisé en annexe. */
export function comparutionCourte(a: Associe): string {
  if (a.type === "personne_morale")
    return `La société ${a.denomination ?? ""}, ${a.forme ?? ""}, dont le siège social est situé ${
      a.siege ?? ""
    }, immatriculée sous le numéro ${a.siren ?? ""}, représentée par ${a.representant ?? ""}`;
  return `${nomCompletPhysique(a)}, demeurant ${a.adresse ?? ""}, né${accord(
    a,
  )} le ${dateEnLettresFr(a.date_naissance)} à ${a.lieu_naissance ?? ""}, de nationalité ${
    a.nationalite ?? ""
  }`;
}

export const associesDe = (associes: Associe[]) => associes.filter((a) => a.est_associe);
export const presidentDe = (associes: Associe[]) =>
  associes.find((a) => a.est_dirigeant && a.fonction === "president");
export const directeurGeneralDe = (associes: Associe[]) =>
  associes.find((a) => a.est_dirigeant && a.fonction === "directeur_general");

export type ChampManquant = { champ: string; etape: string };

/**
 * Contrôles bloquants avant génération des statuts SAS/SASU.
 * Aucun placeholder n'est toléré dans l'acte : la donnée manquante empêche la génération.
 */
export function champsManquantsStatutsSas(d: Dossier, associes: Associe[]): ChampManquant[] {
  const out: ChampManquant[] = [];
  if (!isSas(d.forme_juridique)) return out;
  const add = (champ: string, etape: string) => out.push({ champ, etape });

  if (!d.denomination?.trim()) add("Dénomination sociale", "Dénomination");
  if (!d.siege_adresse?.trim()) add("Adresse du siège social", "Siège social");
  if (!d.objet_social?.trim()) add("Objet social", "Objet social");

  const capital = Number(d.capital_montant) || 0;
  const nominal = Number(d.valeur_part) || 0;
  const parts = associesDe(associes);
  const nbActions = parts.reduce((s, a) => s + (Number(a.nb_titres) || 0), 0);
  const apports = parts.reduce((s, a) => s + (Number(a.montant_apport) || 0), 0);

  if (capital <= 0) add("Montant du capital social", "Capital");
  if (nominal <= 0) add("Valeur nominale des actions", "Capital");
  if (nbActions <= 0) add("Nombre d'actions réparties entre les associés", "Associés");
  if (nominal > 0 && nbActions > 0 && Math.abs(nbActions * nominal - capital) > 0.005)
    add(
      `Cohérence du capital : ${nbActions} actions × ${nominal} € ne correspond pas à ${capital} €`,
      "Capital",
    );
  if (capital > 0 && Math.abs(apports - capital) > 0.005)
    add(
      `Cohérence des apports : le total des apports (${apports} €) doit égaler le capital (${capital} €)`,
      "Associés",
    );

  if (!d.banque_depot?.trim()) add("Établissement bancaire de dépôt des fonds", "Capital");
  if (!d.ville_signature?.trim()) add("Ville de signature", "Récapitulatif");
  if (!d.date_cloture_premier_exercice) add("Date de clôture du premier exercice", "Récapitulatif");
  if (!d.date_signature) add("Date de signature des actes", "Récapitulatif");

  if (!presidentDe(associes)) add("Désignation du Président", "Associés");

  for (const a of parts) {
    const qui = a.type === "personne_morale" ? (a.denomination ?? "Associé") : nomCompletPhysique(a) || "Associé";
    if (a.type === "personne_morale") {
      if (!a.denomination?.trim()) add("Dénomination de l'associé personne morale", "Associés");
      if (!a.siren?.trim()) add(`SIREN de ${qui}`, "Associés");
      if (!a.siege?.trim()) add(`Siège de ${qui}`, "Associés");
      if (!a.representant?.trim()) add(`Représentant de ${qui}`, "Associés");
      continue;
    }
    if (!a.civilite) add(`Civilité de ${qui}`, "Associés");
    if (!prenomsAssocie(a)) add(`Prénoms de ${qui}`, "Associés");
    if (!a.nom?.trim()) add(`Nom de ${qui}`, "Associés");
    if (!a.date_naissance) add(`Date de naissance de ${qui}`, "Associés");
    if (!a.lieu_naissance?.trim()) add(`Lieu de naissance de ${qui}`, "Associés");
    if (!a.nationalite?.trim()) add(`Nationalité de ${qui}`, "Associés");
    if (!a.adresse?.trim()) add(`Adresse de ${qui}`, "Associés");
    if (!a.situation_matrimoniale) add(`Situation matrimoniale de ${qui}`, "Associés");
    if (a.situation_matrimoniale === "marie") {
      if (!a.regime_matrimonial) add(`Régime matrimonial de ${qui}`, "Associés");
      if (!a.date_mariage) add(`Date de mariage de ${qui}`, "Associés");
      if (!a.lieu_mariage?.trim()) add(`Lieu de mariage de ${qui}`, "Associés");
      if (!a.conjoint_nom?.trim()) add(`Nom du conjoint de ${qui}`, "Associés");
      if (!a.conjoint_civilite) add(`Civilité du conjoint de ${qui}`, "Associés");
    }
    if (a.situation_matrimoniale === "pacse") {
      if (!a.date_pacs) add(`Date du PACS de ${qui}`, "Associés");
      if (!a.conjoint_nom?.trim()) add(`Nom du partenaire de ${qui}`, "Associés");
      if (!a.conjoint_civilite) add(`Civilité du partenaire de ${qui}`, "Associés");
    }
  }
  return out;
}

/**
 * Apports en nature dépassant 30 000 € ou la moitié du capital : la revue du
 * cabinet est requise (commissaire aux apports ou dispense, art. L. 227-1 et D. 227-3).
 */
export function revueApportsNatureRequise(d: Dossier, totalNature: number) {
  const capital = Number(d.capital_montant) || 0;
  return totalNature > 30000 || (capital > 0 && totalNature > capital / 2);
}

/** Avertissement non bloquant sur la durée du premier exercice. */
export function avertissementPremierExercice(d: Dossier): string | null {
  if (!d.date_cloture_premier_exercice) return null;
  const limite = new Date(`${new Date().getFullYear() + 1}-12-31`);
  if (new Date(d.date_cloture_premier_exercice) > limite)
    return "La clôture du premier exercice dépasse le 31 décembre de l'année civile suivant l'immatriculation : les greffes refusent généralement cette durée.";
  return null;
}

/** Valeur proposée par défaut pour la clôture du premier exercice. */
export function clotureParDefaut(cloture: string | null | undefined): string {
  const [j, m] = (cloture ?? "31/12").split("/");
  const maintenant = new Date();
  const annee = maintenant.getMonth() >= 6 ? maintenant.getFullYear() + 1 : maintenant.getFullYear();
  return `${annee}-${m ?? "12"}-${j ?? "31"}`;
}
