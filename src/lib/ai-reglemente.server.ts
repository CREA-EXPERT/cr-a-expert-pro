const SYSTEME =
  "Tu es un assistant d'information générale sur la réglementation des activités professionnelles " +
  "en France. À partir de la description d'une activité, tu indiques si elle relève, en règle " +
  "générale, d'une activité réglementée (diplôme, qualification, agrément, autorisation, carte " +
  "professionnelle, inscription à un ordre, assurance obligatoire) ou non. " +
  "Tu ne donnes JAMAIS de conseil juridique personnalisé et tu ne certifies rien : tu informes. " +
  "Réponds STRICTEMENT en JSON, sans texte autour, avec exactement ces clés : " +
  '{"reglementee": "oui" | "non" | "incertain", "activite": string, "explication": string, ' +
  '"exigences": string[], "justificatifs": string[]}. ' +
  "« explication » : 2 à 4 phrases sobres, en français. " +
  "« exigences » : les conditions d'accès habituelles (diplôme précis, années d'expérience, " +
  "agrément, inscription à un ordre…). « justificatifs » : les documents qui permettent de le " +
  "prouver. Si l'activité n'est pas réglementée, laisse ces deux listes vides et explique " +
  "pourquoi, en signalant les points de vigilance éventuels (assurance, hygiène, licence de débit " +
  "de boissons, etc.).";

export type AnalyseReglementation = {
  reglementee: "oui" | "non" | "incertain";
  activite: string;
  explication: string;
  exigences: string[];
  justificatifs: string[];
};

/** Analyse d'une activité au regard de la réglementation. Serveur uniquement. */
export async function analyserReglementationServeur(
  activite: string,
  naf?: string,
): Promise<{ analyse: AnalyseReglementation | null; erreur: string | null }> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { analyse: null, erreur: "Vérification momentanément indisponible." };

  const reponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "content-type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEME },
        {
          role: "user",
          content:
            (naf ? `Code d'activité envisagé : ${naf}. ` : "") +
            `Activité décrite : ${activite}`,
        },
      ],
    }),
  });

  if (reponse.status === 429)
    return { analyse: null, erreur: "Trop de demandes en cours. Réessayez dans un instant." };
  if (reponse.status === 402)
    return { analyse: null, erreur: "Vérification momentanément indisponible." };
  if (!reponse.ok) return { analyse: null, erreur: "La vérification n'a pas abouti. Réessayez." };

  const json = (await reponse.json()) as { choices?: { message?: { content?: string } }[] };
  const brut = json.choices?.[0]?.message?.content?.trim() ?? "";
  try {
    const objet = JSON.parse(brut.replace(/^```json/i, "").replace(/```$/, "").trim()) as
      AnalyseReglementation;
    const valeur = ["oui", "non", "incertain"].includes(objet.reglementee)
      ? objet.reglementee
      : "incertain";
    return {
      analyse: {
        reglementee: valeur,
        activite: String(objet.activite ?? "").slice(0, 300),
        explication: String(objet.explication ?? "").slice(0, 1500),
        exigences: Array.isArray(objet.exigences) ? objet.exigences.slice(0, 10).map(String) : [],
        justificatifs: Array.isArray(objet.justificatifs)
          ? objet.justificatifs.slice(0, 10).map(String)
          : [],
      },
      erreur: null,
    };
  } catch {
    return { analyse: null, erreur: "La réponse n'a pas pu être interprétée. Réessayez." };
  }
}
