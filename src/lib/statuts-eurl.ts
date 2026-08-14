/**
 * Gabarit EURL (SARL à associé unique) : variantes de l'article 9 (origine des
 * fonds), bascule automatique en SARL en cas de revendication du conjoint
 * (art. 1832-2 C. civ.) et contrôles bloquants propres au gabarit du cabinet.
 *
 * Ce module ne concerne ni les gabarits SAS/SASU, ni SARL, ni SCI.
 */

import type { Associe, Dossier } from "./documents";
import { conjointConcerne, estCommunautaire } from "./documents";
import { nomCompletPhysique, prenomsAssocie, type ChampManquant } from "./statuts-sas";

export const isEurl = (f: string | null | undefined) => f === "EURL";

/** Associé unique du dossier (seul titulaire de parts). */
export function associeUnique(associes: Associe[]): Associe | undefined {
  const titulaires = associes.filter((a) => a.est_associe);
  return titulaires.length === 1 ? titulaires[0] : undefined;
}

/**
 * Le conjoint commun en biens revendique la qualité d'associé : la société
 * comporte alors deux associés, le dossier doit basculer en SARL.
 */
export function basculeSarlRequise(d: Dossier, associes: Associe[]): boolean {
  const a = associeUnique(associes);
  if (!a) return false;
  return conjointConcerne(d, a) && a.conjoint_revendique === true;
}

export const MESSAGE_BASCULE_SARL =
  "Le conjoint revendique la qualité d'associé pour la moitié des parts souscrites au moyen de fonds communs (art. 1832-2 du Code civil) : la société comportera deux associés et ne peut donc pas être une EURL. Le dossier bascule en SARL, la répartition des parts est recalculée par moitié et la revue du cabinet devient obligatoire.";

export type VarianteArticle9 = "A" | "B" | "C";

/**
 * Variante de l'article 9 (origine des fonds) :
 * A — fonds propres ou absence de communauté ;
 * B — fonds communs, conjoint renonçant ;
 * C — fonds communs, conjoint informé sans renonciation.
 */
export function varianteArticle9(d: Dossier, associes: Associe[]): VarianteArticle9 {
  const a = associeUnique(associes);
  if (!a) return "A";
  const communs = estCommunautaire(a) && a.apport_fonds_communs === true;
  if (!communs) return "A";
  return a.conjoint_renonce === true ? "B" : "C";
}

/** Le gérant est-il l'associé unique ? À défaut, gérant tiers personne physique. */
export function gerantTiers(d: Dossier, associes: Associe[]): Associe | undefined {
  if (d.gerant_est_associe_unique !== false) return undefined;
  const unique = associeUnique(associes);
  return associes.find((a) => a.est_dirigeant && a.id !== unique?.id);
}

/** Durée du premier exercice comparée à douze mois, pour l'article 6. */
export function dureePremierExercice(d: Dossier): "superieure" | "inferieure" | "douze" {
  if (!d.date_signature || !d.date_cloture_premier_exercice) return "douze";
  const debut = new Date(d.date_signature);
  const fin = new Date(d.date_cloture_premier_exercice);
  const mois =
    (fin.getFullYear() - debut.getFullYear()) * 12 +
    (fin.getMonth() - debut.getMonth()) +
    (fin.getDate() >= debut.getDate() ? 0 : -1);
  if (mois > 12) return "superieure";
  if (mois < 12) return "inferieure";
  return "douze";
}

/** Contrôles bloquants préalables à la génération des statuts EURL. */
export function champsManquantsStatutsEurl(d: Dossier, associes: Associe[]): ChampManquant[] {
  const out: ChampManquant[] = [];
  if (!isEurl(d.forme_juridique)) return out;
  const add = (champ: string, etape: string) => out.push({ champ, etape });

  const a = associeUnique(associes);
  if (!a) {
    add(
      "L'EURL ne comporte qu'un seul associé : le parcours SARL s'applique au-delà",
      "Associés",
    );
    return out;
  }
  if (basculeSarlRequise(d, associes)) {
    add(
      "Le conjoint revendique la qualité d'associé : le dossier doit être basculé en SARL avant génération",
      "Associés",
    );
    return out;
  }

  if (!d.denomination?.trim()) add("Dénomination sociale", "Dénomination");
  if (!d.siege_adresse?.trim()) add("Adresse du siège social", "Siège social");
  if (!d.objet_social?.trim()) add("Objet social", "Objet social");

  const capital = Number(d.capital_montant) || 0;
  const nominal = Number(d.valeur_part) || 0;
  const nbParts = Number(a.nb_titres) || 0;
  const apport = Number(a.montant_apport) || 0;
  if (capital <= 0) add("Montant du capital social", "Capital");
  if (nominal <= 0) add("Valeur nominale des parts sociales", "Capital");
  if (nbParts <= 0) add("Nombre de parts attribuées à l'associé unique", "Associés");
  if (nominal > 0 && nbParts > 0 && Math.abs(nbParts * nominal - capital) > 0.005)
    add(
      `Cohérence du capital : ${nbParts} parts × ${nominal} € ne correspond pas à ${capital} €`,
      "Capital",
    );
  if (capital > 0 && Math.abs(apport - capital) > 0.005)
    add(
      `Cohérence de l'apport : l'apport de l'associé unique (${apport} €) doit égaler le capital (${capital} €)`,
      "Associés",
    );

  if (!d.regime_fiscal_eurl) add("Régime fiscal de l'EURL (IR de plein droit ou option IS)", "Fiscalité");
  if (!d.banque_depot?.trim()) add("Établissement bancaire de dépôt des fonds", "Capital");
  if (!d.ville_signature?.trim()) add("Ville de signature", "Récapitulatif");
  if (!d.date_cloture_premier_exercice) add("Date de clôture du premier exercice", "Récapitulatif");
  if (!d.date_signature) add("Date de signature des actes", "Récapitulatif");

  const qui = a.type === "personne_morale" ? (a.denomination ?? "Associé") : nomCompletPhysique(a) || "Associé";
  if (a.type === "personne_morale") {
    if (!a.denomination?.trim()) add("Dénomination de l'associé personne morale", "Associés");
    if (!a.siren?.trim()) add(`SIREN de ${qui}`, "Associés");
    if (!a.siege?.trim()) add(`Siège de ${qui}`, "Associés");
    if (!a.representant?.trim()) add(`Représentant de ${qui}`, "Associés");
  } else {
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
    }
    if (a.situation_matrimoniale === "pacse" && !a.date_pacs) add(`Date du PACS de ${qui}`, "Associés");
  }

  // Fonds communs : l'identité complète du conjoint est exigée par le gabarit.
  if (estCommunautaire(a) && a.apport_fonds_communs === true) {
    if (!a.conjoint_civilite) add("Civilité du conjoint de l'associé unique", "Associés");
    if (!a.conjoint_prenom?.trim()) add("Prénom du conjoint de l'associé unique", "Associés");
    if (!a.conjoint_nom?.trim()) add("Nom du conjoint de l'associé unique", "Associés");
    if (!a.conjoint_date_naissance) add("Date de naissance du conjoint de l'associé unique", "Associés");
    if (!a.conjoint_lieu_naissance?.trim())
      add("Lieu de naissance du conjoint de l'associé unique", "Associés");
  }

  // Gérant tiers : personne physique obligatoire (art. L. 223-18 C. com.).
  if (d.gerant_est_associe_unique === false) {
    const g = gerantTiers(d, associes);
    if (!g) add("Identité du gérant tiers", "Associés");
    else if (g.type === "personne_morale")
      add(
        "Le gérant d'une EURL est obligatoirement une personne physique (art. L. 223-18 C. com.)",
        "Associés",
      );
    else {
      if (!g.civilite) add("Civilité du gérant tiers", "Associés");
      if (!prenomsAssocie(g)) add("Prénoms du gérant tiers", "Associés");
      if (!g.nom?.trim()) add("Nom du gérant tiers", "Associés");
      if (!g.date_naissance) add("Date de naissance du gérant tiers", "Associés");
      if (!g.lieu_naissance?.trim()) add("Lieu de naissance du gérant tiers", "Associés");
      if (!g.nationalite?.trim()) add("Nationalité du gérant tiers", "Associés");
      if (!g.adresse?.trim()) add("Adresse du gérant tiers", "Associés");
    }
  }
  return out;
}
