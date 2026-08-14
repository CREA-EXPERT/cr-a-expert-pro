import type { Associe, Dossier } from "./documents";

/**
 * Qualification des bénéficiaires effectifs (art. L. 561-2-2 et R. 561-1 CMF).
 * Est bénéficiaire effectif la personne physique détenant, directement ou
 * indirectement, plus de 25 % du capital ou des droits de vote, ou exerçant
 * par tout autre moyen un pouvoir de contrôle. À défaut, le représentant
 * légal est désigné par défaut.
 */

export type Beneficiaire = {
  associeId: string | null;
  nom: string;
  pourcentage: number | null;
  motif: "detention" | "representant_legal" | "detention_indirecte";
};

export type AnalyseBe = {
  beneficiaires: Beneficiaire[];
  /** Vrai lorsque la qualification repose sur le représentant légal, faute de détention > 25 %. */
  parDefaut: boolean;
  /** Personnes morales dont la chaîne de détention doit être renseignée. */
  moralesAControler: Associe[];
};

const nomDe = (a: Associe) =>
  a.type === "personne_morale"
    ? (a.denomination ?? "Personne morale")
    : `${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "Associé";

/** Part de détention, calculée sur les titres et, à défaut, sur les apports. */
export function pourcentageDetention(a: Associe, associes: Associe[]): number | null {
  const titulaires = associes.filter((p) => p.est_associe);
  const totalTitres = titulaires.reduce((s, p) => s + (p.nb_titres ?? 0), 0);
  if (totalTitres > 0) return ((a.nb_titres ?? 0) / totalTitres) * 100;
  const totalApports = titulaires.reduce((s, p) => s + Number(p.montant_apport ?? 0), 0);
  if (totalApports > 0) return (Number(a.montant_apport ?? 0) / totalApports) * 100;
  return null;
}

export function analyserBeneficiaires(_dossier: Dossier, associes: Associe[]): AnalyseBe {
  const titulaires = associes.filter((a) => a.est_associe);
  const beneficiaires: Beneficiaire[] = [];

  for (const a of titulaires.filter((p) => p.type === "personne_physique")) {
    const pct = pourcentageDetention(a, associes);
    if (pct !== null && pct > 25)
      beneficiaires.push({
        associeId: a.id,
        nom: nomDe(a),
        pourcentage: pct,
        motif: "detention",
      });
  }

  const morales = titulaires.filter((a) => a.type === "personne_morale");
  for (const m of morales) {
    const declares = (m.beneficiaires_indirects ?? "")
      .split(/[\n;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const nom of declares)
      beneficiaires.push({
        associeId: m.id,
        nom,
        pourcentage: null,
        motif: "detention_indirecte",
      });
  }

  const parDefaut = beneficiaires.length === 0;
  if (parDefaut) {
    for (const d of associes.filter((a) => a.est_dirigeant && a.type === "personne_physique"))
      beneficiaires.push({
        associeId: d.id,
        nom: nomDe(d),
        pourcentage: pourcentageDetention(d, associes),
        motif: "representant_legal",
      });
  }

  return { beneficiaires, parDefaut, moralesAControler: morales };
}

export const MOTIF_BE: Record<Beneficiaire["motif"], string> = {
  detention: "Détention de plus de 25 % du capital ou des droits de vote.",
  detention_indirecte: "Contrôle indirect au travers d'un associé personne morale.",
  representant_legal:
    "Aucun associé ne dépasse 25 % : le représentant légal est bénéficiaire effectif par défaut (art. R. 561-1 CMF).",
};
