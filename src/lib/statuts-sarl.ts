/**
 * Gabarit SARL (pluripersonnelle) : comparution propre au gabarit du cabinet,
 * répartition numérotée des parts sociales, revendication de la qualité
 * d'associé par le conjoint (art. 1832-2 C. civ.) et contrôles bloquants.
 *
 * L'EURL et les gabarits SAS/SASU, SCI ne sont pas concernés par ce module.
 */

import { dateEnLettresFr } from "./nombres";
import type { Associe, Dossier } from "./documents";
import { conjointConcerne } from "./documents";
import {
  accord,
  feminin,
  LIBELLE_REGIME,
  nomCompletPhysique,
  prenomsAssocie,
  type ChampManquant,
} from "./statuts-sas";

export const isSarl = (f: string | null | undefined) => f === "SARL";

/** Le conjoint de cet associé revendique la moitié des parts souscrites. */
export function conjointRevendique(d: Dossier, a: Associe) {
  return conjointConcerne(d, a) && a.conjoint_revendique === true;
}

/** Le conjoint est averti mais renonce : clause de renonciation (bloc B). */
export function conjointRenonce(d: Dossier, a: Associe) {
  return conjointConcerne(d, a) && a.conjoint_revendique !== true;
}

const moitieHaute = (n: number) => Math.ceil(n / 2);
const moitieBasse = (n: number) => Math.floor(n / 2);

/**
 * Associé « virtuel » créé pour le conjoint revendiquant : il devient associé
 * pour la moitié des parts souscrites par son époux ou son épouse.
 */
function associeConjoint(a: Associe): Associe {
  const titres = Number(a.nb_titres) || 0;
  const apport = Number(a.montant_apport) || 0;
  return {
    ...a,
    id: `${a.id}-conjoint`,
    est_dirigeant: false,
    fonction: null,
    est_associe: true,
    civilite: a.conjoint_civilite,
    prenom: a.conjoint_prenom,
    prenoms: a.conjoint_prenom ? [a.conjoint_prenom] : [],
    nom: a.conjoint_nom,
    date_naissance: a.conjoint_date_naissance,
    lieu_naissance: a.conjoint_lieu_naissance,
    nb_titres: moitieBasse(titres),
    montant_apport: apport / 2,
    conjoint_civilite: a.civilite,
    conjoint_prenom: prenomsAssocie(a) || a.prenom,
    conjoint_nom: a.nom,
    conjoint_date_naissance: a.date_naissance,
    conjoint_lieu_naissance: a.lieu_naissance,
    conjoint_revendique: true,
    apport_fonds_communs: true,
  } as Associe;
}

/**
 * Liste des associés effectivement titulaires de parts : les conjoints
 * revendiquants sont insérés juste après leur époux ou épouse, dont la
 * souscription est réduite de moitié.
 */
export function associesEffectifs(d: Dossier, associes: Associe[]): Associe[] {
  const out: Associe[] = [];
  for (const a of associes.filter((p) => p.est_associe)) {
    if (!conjointRevendique(d, a)) {
      out.push(a);
      continue;
    }
    const titres = Number(a.nb_titres) || 0;
    const apport = Number(a.montant_apport) || 0;
    out.push({
      ...a,
      nb_titres: moitieHaute(titres),
      montant_apport: apport / 2,
    } as Associe);
    out.push(associeConjoint(a));
  }
  return out;
}

export type LigneRepartition = {
  associe: Associe;
  parts: number;
  debut: number;
  fin: number;
};

/** Numérotation continue des parts, dans l'ordre des associés du dossier. */
export function repartitionParts(associes: Associe[]): LigneRepartition[] {
  let curseur = 1;
  return associes.map((a) => {
    const parts = Number(a.nb_titres) || 0;
    const debut = curseur;
    const fin = curseur + parts - 1;
    curseur += parts;
    return { associe: a, parts, debut, fin };
  });
}

/** Comparution personne physique — ordre propre au gabarit SARL. */
export function comparutionSarl(a: Associe): string[] {
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
  const lignes = [
    `${a.civilite ?? ""} ${prenomsAssocie(a)} ${a.nom ?? ""}`.replace(/\s+/g, " ").trim() + ",",
    `De nationalité ${a.nationalite ?? ""} ;`,
    `Né${e} le ${dateEnLettresFr(a.date_naissance)} à ${a.lieu_naissance ?? ""} ;`,
  ];

  switch (a.situation_matrimoniale) {
    case "marie": {
      const conjointFeminin = a.conjoint_civilite === "Madame";
      const regime = LIBELLE_REGIME[a.regime_matrimonial ?? ""] ?? "matrimonial déclaré";
      lignes.push(
        `${feminin(a) ? "Épouse" : "Époux"} de ${a.conjoint_civilite ?? ""} ${
          a.conjoint_prenom ? `${a.conjoint_prenom} ` : ""
        }${a.conjoint_nom ?? ""}, né${conjointFeminin ? "e" : ""} le ${dateEnLettresFr(
          a.conjoint_date_naissance,
        )} à ${a.conjoint_lieu_naissance ?? ""}, avec ${
          feminin(a) ? "lequel elle est mariée" : "laquelle il est marié"
        } sous le régime ${regime} à leur union célébrée à ${
          a.lieu_mariage ?? ""
        } le ${dateEnLettresFr(a.date_mariage)} ;`
          .replace(/\s+/g, " ")
          .trim(),
      );
      break;
    }
    case "pacse": {
      const regime =
        a.regime_matrimonial === "indivision_pacs" ? "l'indivision" : "la séparation de biens";
      lignes.push(
        `Lié${e} par un pacte civil de solidarité conclu le ${dateEnLettresFr(
          a.date_pacs,
        )} avec ${a.conjoint_civilite ?? ""} ${a.conjoint_nom ?? ""}, sous le régime de ${regime} ;`
          .replace(/\s+/g, " ")
          .trim(),
      );
      break;
    }
    case "divorce":
      lignes.push(`Divorcé${e} et non remarié${e} ;`);
      break;
    case "veuf":
      lignes.push(feminin(a) ? "Veuve et non remariée ;" : "Veuf et non remarié ;");
      break;
    default:
      lignes.push("Célibataire ;");
      break;
  }

  lignes.push(`Demeurant au ${a.adresse ?? ""}.`);
  return lignes;
}

export const gerantsDe = (associes: Associe[]) =>
  associes.filter((a) => a.est_dirigeant && a.fonction === "gerant");

/** Contrôles bloquants préalables à la génération des statuts SARL. */
export function champsManquantsStatutsSarl(d: Dossier, associes: Associe[]): ChampManquant[] {
  const out: ChampManquant[] = [];
  if (!isSarl(d.forme_juridique)) return out;
  const add = (champ: string, etape: string) => out.push({ champ, etape });

  if (!d.denomination?.trim()) add("Dénomination sociale", "Dénomination");
  if (!d.siege_adresse?.trim()) add("Adresse du siège social", "Siège social");
  if (!d.objet_social?.trim()) add("Objet social", "Objet social");

  const capital = Number(d.capital_montant) || 0;
  const nominal = Number(d.valeur_part) || 0;
  const titulaires = associesEffectifs(d, associes);
  const nbParts = titulaires.reduce((s, a) => s + (Number(a.nb_titres) || 0), 0);
  const apports = titulaires.reduce((s, a) => s + (Number(a.montant_apport) || 0), 0);

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

  if (titulaires.length < 2)
    add(
      "La SARL requiert au moins deux associés : avec un associé unique, le parcours EURL s'applique",
      "Associés",
    );
  if (titulaires.length > 100)
    add("La SARL ne peut compter plus de cent associés (art. L. 223-3 C. com.)", "Associés");

  const gerants = gerantsDe(associes);
  if (gerants.length === 0) add("Désignation d'au moins un gérant", "Associés");
  if (gerants.some((g) => g.type === "personne_morale"))
    add(
      "Le gérant d'une SARL est obligatoirement une personne physique (art. L. 223-18 C. com.)",
      "Associés",
    );

  if (!d.banque_depot?.trim()) add("Établissement bancaire de dépôt des fonds", "Capital");
  if (!d.ville_signature?.trim()) add("Ville de signature", "Récapitulatif");
  if (!d.date_cloture_premier_exercice) add("Date de clôture du premier exercice", "Récapitulatif");
  if (!d.date_signature) add("Date de signature des actes", "Récapitulatif");

  for (const a of titulaires) {
    const qui =
      a.type === "personne_morale" ? (a.denomination ?? "Associé") : nomCompletPhysique(a) || "Associé";
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
      if (!a.conjoint_date_naissance) add(`Date de naissance du conjoint de ${qui}`, "Associés");
      if (!a.conjoint_lieu_naissance?.trim())
        add(`Lieu de naissance du conjoint de ${qui}`, "Associés");
    }
    if (a.situation_matrimoniale === "pacse") {
      if (!a.date_pacs) add(`Date du PACS de ${qui}`, "Associés");
      if (!a.conjoint_nom?.trim()) add(`Nom du partenaire de ${qui}`, "Associés");
      if (!a.conjoint_civilite) add(`Civilité du partenaire de ${qui}`, "Associés");
    }
  }
  return out;
}
