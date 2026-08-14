/**
 * Robot de vérification des pièces déposées (aide au contrôle, jamais une validation).
 * Vision IA via la passerelle Lovable. Serveur uniquement.
 */

export type ResultatControle = "conforme" | "doute" | "non_conforme";

export type Controle = {
  type_controle: string;
  resultat: ResultatControle;
  motif: string;
};

export type SortieRobot = {
  controles: Controle[];
  synthese: ResultatControle;
  modele: string;
};

export const MODELE_VISION = "google/gemini-3.6-flash";

const SYSTEME_IDENTITE =
  "Tu es un contrôleur de conformité de pièces justificatives françaises. Tu examines des images " +
  "ou PDF de copies de pièces d'identité destinées à un greffe. Tu réponds STRICTEMENT en JSON, " +
  "sans texte autour : {\"controles\":[{\"type_controle\":string,\"resultat\":\"conforme\"|\"doute\"|\"non_conforme\",\"motif\":string}]}. " +
  "Types de contrôle attendus, un objet par contrôle : \"concordance_identite\", \"lisibilite\", " +
  "\"mention_manuscrite\", \"validite\", \"recto_verso\". " +
  "Règles : concordance nom/prénoms/date de naissance avec les données déclarées, en tolérant les " +
  "accents, tirets, majuscules et l'ordre des prénoms composés. Lisibilité : photo visible, texte " +
  "net, document entier dans le cadre, pas de doigt ni de reflet masquant une zone, pas de " +
  "troncature. Mention manuscrite : une mention de certification conforme manuscrite ET une " +
  "signature manuscrite doivent apparaître sur la copie. Validité : la date d'expiration lue doit " +
  "être postérieure à la date du jour. Recto/verso : pour une carte nationale d'identité ou un " +
  "titre de séjour, le recto (photo + identité) ET le verso (adresse, MRZ ou bande de lecture) " +
  "doivent être présents, éventuellement dans deux fichiers distincts ; s'il en manque un, " +
  "resultat \"non_conforme\" et motif « Le verso (ou le recto) de votre pièce d'identité est " +
  "manquant. Déposez la copie recto ET verso. ». Le passeport fait exception : la double page " +
  "d'identité suffit, aucune exigence de verso. " +
  "Les motifs sont rédigés en français clair, sobre, à la deuxième personne, sans jargon. " +
  "Si un élément n'est pas déterminable avec certitude, utilise \"doute\".";

const SYSTEME_DOMICILE =
  "Tu es un contrôleur de conformité de justificatifs de domicile français. Tu réponds STRICTEMENT " +
  "en JSON : {\"controles\":[{\"type_controle\":string,\"resultat\":\"conforme\"|\"doute\"|\"non_conforme\",\"motif\":string}]}. " +
  "Types attendus : \"type_admis\", \"concordance_nom\", \"anciennete\", \"lisibilite\". " +
  "Documents admis : facture d'électricité ou de gaz, facture d'eau, facture de téléphone fixe, " +
  "mobile ou internet, avis d'imposition ou de taxe foncière, quittance de loyer émise par un " +
  "bailleur professionnel, attestation d'assurance habitation. Ne sont pas admis : factures " +
  "d'achat, relevés bancaires, courriers publicitaires, échéanciers. Ancienneté : moins de trois " +
  "mois, sauf taxe foncière ou avis d'imposition, admis pour l'année en cours. " +
  "Motifs en français clair et sobre. Si indéterminable, \"doute\".";

const SYSTEME_PARUTION =
  "Tu es un contrôleur d'attestations de parution d'annonce légale françaises destinées à un " +
  "greffe. Tu réponds STRICTEMENT en JSON : " +
  "{\"controles\":[{\"type_controle\":string,\"resultat\":\"conforme\"|\"doute\"|\"non_conforme\",\"motif\":string}]}. " +
  "Types attendus : \"denomination\", \"forme_juridique\", \"capital\", \"siege\", \"dirigeants\", " +
  "\"date_parution\", \"lisibilite\". " +
  "Extrais de l'attestation la dénomination, la forme juridique, le capital, l'adresse du siège, " +
  "l'identité du ou des dirigeants et la date de parution, puis compare CHAMP PAR CHAMP avec les " +
  "données du dossier fournies. La moindre divergence (faute de frappe dans la dénomination, " +
  "capital différent, adresse différente, dirigeant absent) est une cause certaine de rejet du " +
  "greffe : resultat \"non_conforme\", avec un motif qui liste précisément les écarts constatés " +
  "(valeur lue puis valeur attendue). Tolérance UNIQUEMENT sur la casse et les abréviations " +
  "usuelles (SARL / S.A.R.L., av. / avenue). Motifs en français clair et sobre. Si un élément " +
  "n'est pas lisible, \"doute\".";

const SYSTEME_DEPOT_FONDS =
  "Tu es un contrôleur d'attestations bancaires de dépôt du capital social. Tu réponds STRICTEMENT " +
  "en JSON : {\"controles\":[{\"type_controle\":string,\"resultat\":\"conforme\"|\"doute\"|\"non_conforme\",\"motif\":string}]}. " +
  "Types attendus : \"denomination\", \"montant\", \"date\", \"etablissement\", \"lisibilite\". " +
  "Extrais la dénomination de la société en formation, le montant déposé, la date et " +
  "l'établissement dépositaire. Le montant doit correspondre EXACTEMENT au montant libéré déclaré " +
  "dans le dossier (une libération partielle est possible : compare au montant libéré, jamais au " +
  "capital total). La dénomination doit être identique à celle du dossier, à la casse et aux " +
  "abréviations usuelles près. Toute divergence : resultat \"non_conforme\" avec un motif " +
  "détaillant la valeur lue et la valeur attendue. Motifs en français clair et sobre. Si un " +
  "élément n'est pas lisible, \"doute\".";

const SYSTEMES: Record<CategorieAnalyse, string> = {
  identite: SYSTEME_IDENTITE,
  domicile: SYSTEME_DOMICILE,
  parution: SYSTEME_PARUTION,
  depot_fonds: SYSTEME_DEPOT_FONDS,
};

export type CategorieAnalyse = "identite" | "domicile" | "parution" | "depot_fonds";

export type FichierAnalyse = { base64: string; mime: string };

export async function analyserPiece({
  categorie,
  fichiers,
  contexte,
}: {
  categorie: CategorieAnalyse;
  fichiers: FichierAnalyse[];
  contexte: string;
}): Promise<{ sortie: SortieRobot | null; erreur: string | null }> {
  const cle = process.env["LOVABLE_API_KEY"];
  if (!cle) return { sortie: null, erreur: "Vérification automatique indisponible." };
  if (fichiers.length === 0) return { sortie: null, erreur: "Aucun fichier à analyser." };

  const blocs = fichiers.map((f) =>
    f.mime === "application/pdf"
      ? {
          type: "file" as const,
          file: { filename: "piece.pdf", file_data: `data:${f.mime};base64,${f.base64}` },
        }
      : {
          type: "image_url" as const,
          image_url: { url: `data:${f.mime};base64,${f.base64}` },
        },
  );

  const reponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": cle, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELE_VISION,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEMES[categorie] },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Date du jour : ${new Date().toISOString().slice(0, 10)}.\n` +
                `${contexte}\n` +
                `Nombre de fichiers déposés pour cette pièce : ${fichiers.length}.`,
            },
            ...blocs,
          ],
        },
      ],
    }),
  });

  if (reponse.status === 429)
    return { sortie: null, erreur: "Vérification différée : trop de demandes en cours." };
  if (!reponse.ok) return { sortie: null, erreur: "La vérification automatique n'a pas abouti." };

  const json = (await reponse.json()) as { choices?: { message?: { content?: string } }[] };
  const brut = json.choices?.[0]?.message?.content?.trim() ?? "";
  try {
    const objet = JSON.parse(brut.replace(/^```json/i, "").replace(/```$/, "").trim()) as {
      controles?: Controle[];
    };
    const controles = (objet.controles ?? [])
      .filter((c) => c && typeof c.type_controle === "string")
      .slice(0, 8)
      .map((c) => ({
        type_controle: String(c.type_controle).slice(0, 60),
        resultat: (["conforme", "doute", "non_conforme"] as const).includes(c.resultat)
          ? c.resultat
          : ("doute" as ResultatControle),
        motif: String(c.motif ?? "").slice(0, 600),
      }));
    if (controles.length === 0) return { sortie: null, erreur: "Résultat illisible." };
    const synthese: ResultatControle = controles.some((c) => c.resultat === "non_conforme")
      ? "non_conforme"
      : controles.some((c) => c.resultat === "doute")
        ? "doute"
        : "conforme";
    return { sortie: { controles, synthese, modele: MODELE_VISION }, erreur: null };
  } catch {
    return { sortie: null, erreur: "Résultat illisible." };
  }
}
