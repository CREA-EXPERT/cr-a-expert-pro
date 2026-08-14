/**
 * Gabarit SCI (société civile immobilière) : garde-fous propres au caractère
 * civil de la société, mécanique de l'article 1832-2 du Code civil reprise du
 * gabarit SARL, et contrôles bloquants préalables à la génération.
 *
 * Ce module ne concerne ni les gabarits SAS/SASU, ni SARL, ni EURL.
 */

import type { Associe, Dossier } from "./documents";
import { estCommunautaire } from "./documents";
import { nomCompletPhysique, prenomsAssocie, type ChampManquant } from "./statuts-sas";
import { associesEffectifs, repartitionParts } from "./statuts-sarl";

export const isSciForme = (f: string | null | undefined) => f === "SCI";

export { associesEffectifs, repartitionParts };

/** Le conjoint commun en biens est informé de l'emploi de fonds communs. */
export function conjointInforme(a: Associe) {
  return estCommunautaire(a) && a.apport_fonds_communs === true;
}

/** Avertissements non bloquants imposant la revue du cabinet. */
export function avertissementsSci(d: Dossier, associes: Associe[]): string[] {
  const out: string[] = [];
  if (!isSciForme(d.forme_juridique)) return out;
  if (d.location_meublee)
    out.push(
      "La location meublée exercée à titre habituel est une activité commerciale : elle rend la société passible de l'impôt sur les sociétés de plein droit (art. 206, 2 du Code général des impôts) et contredit le caractère civil de l'objet. La revue du cabinet est obligatoire.",
    );
  if (associes.some((a) => a.type === "personne_morale"))
    out.push(
      "Associé personne morale : les bénéficiaires effectifs doivent être recalculés par transparence, la revue du cabinet est obligatoire.",
    );
  if (associes.some((a) => conjointInforme(a) && a.conjoint_revendique === true))
    out.push(
      "Un conjoint revendique la qualité d'associé pour la moitié des parts souscrites au moyen de fonds communs (art. 1832-2 du Code civil) : la répartition du capital et les bénéficiaires effectifs sont recalculés, la revue du cabinet est obligatoire.",
    );
  return out;
}

/** La société doit-elle passer en revue humaine avant transmission ? */
export const revueCabinetSci = (d: Dossier, associes: Associe[]) =>
  avertissementsSci(d, associes).length > 0;

/** Contrôles bloquants préalables à la génération des statuts SCI. */
export function champsManquantsStatutsSci(d: Dossier, associes: Associe[]): ChampManquant[] {
  const out: ChampManquant[] = [];
  if (!isSciForme(d.forme_juridique)) return out;
  const add = (champ: string, etape: string) => out.push({ champ, etape });

  if (!d.denomination?.trim()) add("Dénomination sociale", "Dénomination");
  if (!d.siege_adresse?.trim()) add("Adresse du siège social", "Siège social");

  // L'apport d'un immeuble suppose un acte notarié et la publicité foncière.
  if (d.apport_immeuble || d.apport_nature)
    add(
      "Apport en nature d'un immeuble : l'acte notarié et la publicité foncière sont requis (art. 710-1 du Code civil), le cabinet doit reprendre le dossier",
      "Capital",
    );

  const titulaires = associesEffectifs(d, associes);
  const capital = Number(d.capital_montant) || 0;
  const nominal = Number(d.valeur_part) || 0;
  const nbParts = titulaires.reduce((s, a) => s + (Number(a.nb_titres) || 0), 0);
  const apports = titulaires.reduce((s, a) => s + (Number(a.montant_apport) || 0), 0);

  if (titulaires.length < 2)
    add(
      "La société civile requiert au moins deux associés à la constitution (art. 1832 du Code civil)",
      "Associés",
    );
  if (capital <= 0) add("Montant du capital social", "Capital");
  if (nominal <= 0) add("Valeur nominale des parts sociales", "Capital");
  if (nbParts <= 0) add("Nombre de parts réparties entre les associés", "Associés");
  if (nominal > 0 && nbParts > 0 && Math.abs(nbParts * nominal - capital) > 0.005)
    add(
      `Cohérence du capital : ${nbParts} parts × ${nominal} € ne correspond pas à ${capital} €`,
      "Capital",
    );
  if (capital > 0 && Math.abs(apports - capital) > 0.005)
    add(
      `Cohérence des apports : le total des apports (${apports} €) doit égaler le capital (${capital} €)`,
      "Associés",
    );

  // La numérotation des parts doit être continue, de 1 au nombre total de parts.
  const lignes = repartitionParts(titulaires);
  const premiere = lignes[0];
  const derniere = lignes[lignes.length - 1];
  if (premiere && derniere && (premiere.debut !== 1 || derniere.fin !== nbParts))
    add("Numérotation des parts sociales discontinue", "Associés");


  if (!d.regime_fiscal_sci)
    add("Régime fiscal de la SCI (IR de plein droit ou option pour l'IS)", "Fiscalité");
  if (!d.greffe_ville?.trim()) add("Ville du greffe compétent", "Siège social");
  if (!d.ville_signature?.trim()) add("Ville de signature", "Récapitulatif");
  if (!d.date_cloture_premier_exercice) add("Date de clôture du premier exercice", "Récapitulatif");
  if (!d.date_signature) add("Date de signature des actes", "Récapitulatif");

  const gerants = associes.filter((a) => a.est_dirigeant);
  if (gerants.length === 0) add("Désignation d'au moins un gérant", "Associés");

  for (const a of [...titulaires, ...gerants.filter((g) => !g.est_associe)]) {
    const qui =
      a.type === "personne_morale" ? (a.denomination ?? "Associé") : nomCompletPhysique(a) || "Associé";
    if (a.type === "personne_morale") {
      if (!a.denomination?.trim()) add("Dénomination de la personne morale", "Associés");
      if (!a.forme?.trim()) add(`Forme de ${qui}`, "Associés");
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
      if (!a.conjoint_civilite) add(`Civilité du conjoint de ${qui}`, "Associés");
      if (!a.conjoint_nom?.trim()) add(`Nom du conjoint de ${qui}`, "Associés");
    }
    if (a.situation_matrimoniale === "pacse" && !a.date_pacs) add(`Date du PACS de ${qui}`, "Associés");
    if (conjointInforme(a)) {
      if (!a.conjoint_prenom?.trim()) add(`Prénom du conjoint de ${qui}`, "Associés");
      if (!a.conjoint_nom?.trim()) add(`Nom du conjoint de ${qui}`, "Associés");
    }
  }
  return out;
}
