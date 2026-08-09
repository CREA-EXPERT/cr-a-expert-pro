const SYSTEME =
  "Tu assistes la création de sociétés françaises. À partir d'une activité décrite en " +
  "quelques mots, tu renvoies STRICTEMENT un objet JSON, sans texte autour, avec les clés : " +
  '{"texte": string, "naf_code": string, "naf_libelle": string, "reglementee": boolean, "motif": string}. ' +
  "« texte » : le paragraphe d'objet social à insérer dans les statuts, en français, une à deux " +
  "phrases (60 mots maximum), à l'infinitif nominal, suffisamment large pour couvrir les " +
  "activités connexes, terminé par « et, plus généralement, toutes opérations se rattachant " +
  "directement ou indirectement à cet objet. ». " +
  "« naf_code » : le code NAF français le plus probable au format 00.00X. " +
  "« naf_libelle » : l'intitulé INSEE correspondant. " +
  "« reglementee » : true si l'activité suppose en règle générale un diplôme, une " +
  "qualification, un agrément, une carte professionnelle ou une inscription à un ordre. " +
  "« motif » : une phrase factuelle et générale, sans conseil juridique personnalisé.";

export type AnalyseActivite = {
  texte: string;
  naf_code: string | null;
  naf_libelle: string | null;
  reglementee: boolean;
  motif: string;
  erreur: string | null;
};

function vide(erreur: string): AnalyseActivite {
  return { texte: "", naf_code: null, naf_libelle: null, reglementee: false, motif: "", erreur };
}

/** Analyse d'une activité décrite librement. Serveur uniquement. */
export async function analyserActiviteServeur(
  description: string,
  forme: string,
): Promise<AnalyseActivite> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return vide("Assistance à la rédaction indisponible.");

  const reponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "content-type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: SYSTEME },
        {
          role: "user",
          content: `Forme juridique : ${forme}. Activité décrite par le créateur : ${description}`,
        },
      ],
    }),
  });

  if (reponse.status === 429) return vide("Trop de demandes en cours. Réessayez dans un instant.");
  if (reponse.status === 402) return vide("Assistance momentanément indisponible.");
  if (!reponse.ok) return vide("L'analyse n'a pas abouti. Réessayez.");

  const json = (await reponse.json()) as { choices?: { message?: { content?: string } }[] };
  const brut = json.choices?.[0]?.message?.content?.trim() ?? "";
  const bloc = brut.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const o = JSON.parse(bloc) as Record<string, unknown>;
    const texte = typeof o["texte"] === "string" ? o["texte"].trim() : "";
    if (!texte) return vide("Aucune proposition n'a pu être générée.");
    const code = typeof o["naf_code"] === "string" ? o["naf_code"].trim().toUpperCase() : "";
    return {
      texte,
      naf_code: /^\d{2}\.\d{2}[A-Z]$/.test(code) ? code : null,
      naf_libelle: typeof o["naf_libelle"] === "string" ? o["naf_libelle"].trim() : null,
      reglementee: o["reglementee"] === true,
      motif: typeof o["motif"] === "string" ? o["motif"].trim() : "",
      erreur: null,
    };
  } catch {
    return vide("La réponse de l'assistant n'a pas pu être lue. Réessayez.");
  }
}
