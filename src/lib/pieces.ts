/**
 * Cycle de vie d'une pièce déposée et règles de dépôt.
 * Source unique partagée entre l'espace client et l'espace cabinet.
 */

export const STATUTS_PIECE = [
  "a_fournir",
  "depose",
  "en_revue",
  "valide",
  "a_corriger",
  "refuse",
] as const;

export type StatutPieceDoc = (typeof STATUTS_PIECE)[number];

/** Anciennes valeurs encore présentes en base. */
const LEGACY: Record<string, StatutPieceDoc> = {
  recu: "depose",
  rejete: "a_corriger",
};

export function normaliserStatut(valeur: string | null | undefined): StatutPieceDoc {
  if (!valeur) return "a_fournir";
  if ((STATUTS_PIECE as readonly string[]).includes(valeur)) return valeur as StatutPieceDoc;
  return LEGACY[valeur] ?? "a_fournir";
}

export const LIBELLE_STATUT: Record<StatutPieceDoc, { label: string; cls: string }> = {
  a_fournir: { label: "À fournir", cls: "bg-muted text-foreground" },
  depose: { label: "Déposée, en attente de revue", cls: "bg-info text-info-foreground" },
  en_revue: { label: "En cours de revue", cls: "bg-info text-info-foreground" },
  valide: { label: "Validée", cls: "bg-success text-success-foreground" },
  a_corriger: { label: "À corriger", cls: "bg-destructive text-destructive-foreground" },
  refuse: { label: "Refusée", cls: "bg-destructive text-destructive-foreground" },
};

/** Une pièce refusée ou à corriger doit être redéposée. */
export function aRedeposer(statut: StatutPieceDoc) {
  return statut === "a_corriger" || statut === "refuse";
}

export const TAILLE_MAX_OCTETS = 10 * 1024 * 1024;
export const TYPES_ACCEPTES = ["application/pdf", "image/jpeg", "image/png"];
export const ACCEPT_ATTR = "application/pdf,image/jpeg,image/png";

/** Message clair et non technique si le fichier est refusé, sinon null. */
export function validerFichier(fichier: File): string | null {
  const extension = fichier.name.split(".").pop()?.toLowerCase() ?? "";
  const extensionOk = ["pdf", "jpg", "jpeg", "png"].includes(extension);
  if (!TYPES_ACCEPTES.includes(fichier.type) && !extensionOk) {
    return `« ${fichier.name} » n'est pas dans un format accepté. Déposez un PDF, un JPG ou un PNG.`;
  }
  if (fichier.size > TAILLE_MAX_OCTETS) {
    return `« ${fichier.name} » est trop volumineux (${formaterTaille(fichier.size)}). La limite est de 10 Mo par fichier.`;
  }
  if (fichier.size === 0) {
    return `« ${fichier.name} » est vide. Vérifiez le fichier puis recommencez.`;
  }
  return null;
}

export function formaterTaille(octets: number) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Pièce d'identité soumise aux obligations de vigilance (KYC/LBC-FT). */
export function estPieceIdentite(typeDocument: string) {
  return typeDocument === "piece_identite" || typeDocument.startsWith("identite_");
}

export function estImage(chemin: string | null | undefined) {
  const e = (chemin ?? "").split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png"].includes(e);
}

export function estPdf(chemin: string | null | undefined) {
  return (chemin ?? "").toLowerCase().endsWith(".pdf");
}
