/** Texte partagé de l'avertissement financier, réutilisé dans les emails serveur. */
export const TEXTE_AVERTISSEMENT_REJET_SERVEUR =
  "En cas de rejet du dossier par le greffe pour pièce non conforme, les frais de greffe doivent être payés à nouveau, et les frais d'annonce légale peuvent également devoir être réengagés. Vérifiez soigneusement chaque document avant transmission.";

/** Préambule des rappels d'information sur la dénomination, identique à l'écran. */
export const PREAMBULE_INFO_DENOMINATION =
  "Pour information, sans conséquence sur la suite de votre dossier :";

function echapperHtml(texte: string) {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Bloc HTML des informations de dénomination pour les emails de progression.
 * Les phrases proviennent de `revuesDenomination` : elles sont donc rigoureusement
 * identiques à celles du récapitulatif final. Jamais présentées comme un blocage.
 */
export function blocInfoDenominationHtml(revues: string[]) {
  if (revues.length === 0) return "";
  return (
    `<p>${PREAMBULE_INFO_DENOMINATION}</p>` +
    `<ul>${revues.map((r) => `<li>${echapperHtml(r)}</li>`).join("")}</ul>`
  );
}
