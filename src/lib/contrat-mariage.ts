/**
 * Contrôles de cohérence du contrat de mariage ou de la convention de PACS :
 * étude notariale, nom du notaire et date de l'acte. Utilisé par le formulaire
 * des associés et par le contrôle bloquant de l'étape « Associés ».
 */

export type ChampsContratMariage = {
  contrat_mariage?: boolean | null;
  contrat_mariage_etude?: string | null;
  contrat_mariage_notaire?: string | null;
  contrat_mariage_date?: string | null;
};

const LETTRES = "A-Za-zÀ-ÖØ-öø-ÿ";

/** Date du jour au format ISO (AAAA-MM-JJ), en temps universel. */
export function aujourdhuiISO(maintenant: Date = new Date()): string {
  return new Date(
    Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10);
}

/**
 * La date existe-t-elle réellement au calendrier, sans être future ni absurde ?
 * Renvoie `null` si la date est valide, sinon un message explicite.
 */
export function verifierDateContrat(valeur: string | null | undefined, maintenant?: Date): string | null {
  const v = (valeur ?? "").trim();
  if (!v) return "Indiquez la date de l'acte (jour, mois et année).";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return "Date incomplète ou mal formée : le format attendu est jour, mois et année.";
  const annee = Number(m[1]);
  const mois = Number(m[2]);
  const jour = Number(m[3]);
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  const existe =
    d.getUTCFullYear() === annee && d.getUTCMonth() === mois - 1 && d.getUTCDate() === jour;
  if (!existe)
    return `Cette date n'existe pas au calendrier : le ${jour.toString().padStart(2, "0")}/${mois
      .toString()
      .padStart(2, "0")}/${annee} n'a jamais existé.`;
  if (annee < 1900) return "Date antérieure à 1900 : vérifiez l'année saisie.";
  if (v > aujourdhuiISO(maintenant))
    return "La date de l'acte ne peut pas être postérieure à aujourd'hui.";
  return null;
}

/** Le libellé d'étude notariale est-il exploitable ? */
export function verifierEtudeNotariale(valeur: string | null | undefined): string | null {
  const v = (valeur ?? "").trim();
  if (!v) return "Indiquez l'étude notariale (nom de l'office et commune).";
  if (v.length < 3) return "Nom d'étude trop court : indiquez l'office notarial en toutes lettres.";
  if (v.length > 150) return "Nom d'étude trop long : 150 caractères au maximum.";
  if (!new RegExp(`[${LETTRES}]{2,}`).test(v))
    return "Nom d'étude invalide : au moins deux lettres sont attendues.";
  return null;
}

/** Le nom du notaire est-il exploitable ? */
export function verifierNotaire(valeur: string | null | undefined): string | null {
  const v = (valeur ?? "").trim();
  if (!v) return "Indiquez le nom du notaire ayant reçu l'acte.";
  if (v.length < 3) return "Nom de notaire trop court : indiquez le nom complet.";
  if (v.length > 120) return "Nom de notaire trop long : 120 caractères au maximum.";
  if (!new RegExp(`^[${LETTRES}][${LETTRES}\\s'’.\\-]*$`).test(v))
    return "Nom de notaire invalide : lettres, espaces, apostrophes, points et traits d'union uniquement.";
  return null;
}

export type ErreursContratMariage = {
  etude?: string;
  notaire?: string;
  date?: string;
};

/** Erreurs par champ ; objet vide lorsque la saisie est cohérente. */
export function validerContratMariage(
  a: ChampsContratMariage,
  maintenant?: Date,
): ErreursContratMariage {
  if (!a.contrat_mariage) return {};
  const erreurs: ErreursContratMariage = {};
  const etude = verifierEtudeNotariale(a.contrat_mariage_etude);
  const notaire = verifierNotaire(a.contrat_mariage_notaire);
  const date = verifierDateContrat(a.contrat_mariage_date, maintenant);
  if (etude) erreurs.etude = etude;
  if (notaire) erreurs.notaire = notaire;
  if (date) erreurs.date = date;
  return erreurs;
}

/** La saisie est-elle complète et cohérente ? */
export function contratMariageValide(a: ChampsContratMariage, maintenant?: Date): boolean {
  return Object.keys(validerContratMariage(a, maintenant)).length === 0;
}

/** Résumé texte conservé pour les documents générés. */
export function resumeContratMariage(a: ChampsContratMariage): string {
  const date = (a.contrat_mariage_date ?? "").trim();
  return [
    date ? `Acte du ${date.split("-").reverse().join("/")}` : "",
    (a.contrat_mariage_notaire ?? "").trim() ? `Notaire : ${a.contrat_mariage_notaire!.trim()}` : "",
    (a.contrat_mariage_etude ?? "").trim() ? `Étude : ${a.contrat_mariage_etude!.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" — ");
}
