const SYSTEME =
  "Tu rédiges des objets sociaux pour des sociétés françaises. " +
  "Réponds uniquement par le texte de l'objet social, en français, sans titre, sans guillemets, " +
  "sans commentaire et sans conseil juridique. " +
  "Rédige UNE à DEUX phrases au maximum, courtes et lisibles (60 mots maximum au total), " +
  "à l'infinitif nominal (« La conception, la vente… »), en t'appuyant strictement sur " +
  "l'activité décrite et sur le code d'activité indiqué, suffisamment large pour couvrir " +
  "les activités connexes. Termine par : « et, plus généralement, toutes opérations se " +
  "rattachant directement ou indirectement à cet objet. » " +
  "N'invente aucune mention d'agrément ou d'activité réglementée.";

/** Appel à la passerelle IA de Lovable. Serveur uniquement. */
export async function redigerObjetSocialServeur(
  activite: string,
  forme: string,
  naf?: string,
) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { texte: "", erreur: "Assistance à la rédaction indisponible." };

  const reponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "content-type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: SYSTEME },
        {
          role: "user",
          content:
            `Forme juridique : ${forme}.` +
            (naf ? ` Code d'activité retenu : ${naf}.` : "") +
            ` Activité décrite par le créateur : ${activite}`,
        },
      ],
    }),
  });

  if (reponse.status === 429)
    return { texte: "", erreur: "Trop de demandes en cours. Réessayez dans un instant." };
  if (reponse.status === 402)
    return { texte: "", erreur: "Assistance à la rédaction momentanément indisponible." };
  if (!reponse.ok)
    return { texte: "", erreur: "La rédaction assistée n'a pas abouti. Réessayez." };

  const json = (await reponse.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const texte = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!texte) return { texte: "", erreur: "Aucune proposition n'a pu être générée." };
  return { texte, erreur: null as string | null };
}
