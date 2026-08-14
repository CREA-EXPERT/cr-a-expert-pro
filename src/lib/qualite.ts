/** Catégories normalisées des motifs de rejet, sans aucune donnée personnelle. */
export const CATEGORIES_REJET = [
  { value: "piece_identite", label: "Pièce d'identité" },
  { value: "justificatif_domicile", label: "Justificatif de domicile" },
  { value: "statuts", label: "Statuts" },
  { value: "annonce_legale", label: "Annonce légale" },
  { value: "beneficiaires_effectifs", label: "Bénéficiaires effectifs" },
  { value: "autre", label: "Autre" },
] as const;

export type CategorieRejet = (typeof CATEGORIES_REJET)[number]["value"];

export const LIBELLE_CATEGORIE_REJET: Record<string, string> = Object.fromEntries(
  CATEGORIES_REJET.map((c) => [c.value, c.label]),
);

export function moisCourt(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}
