/** Envoi d'emails transactionnels via Resend. Serveur uniquement. */
export type ResultatEnvoi =
  | { envoye: true }
  | { envoye: false; raison: "non_configure" }
  | { envoye: false; raison: "erreur"; detail: string };

export async function envoyerEmail({
  destinataire,
  sujet,
  html,
  expediteur,
}: {
  destinataire: string;
  sujet: string;
  html: string;
  /** Adresse d'expédition ; par défaut l'adresse de contact. */
  expediteur?: string;
}): Promise<ResultatEnvoi> {
  const cle = process.env["RESEND_API_KEY"];
  if (!cle) return { envoye: false, raison: "non_configure" };

  try {
    const reponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cle}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: expediteur ?? "CREA EXPERT <contact@creaexpert.fr>",
        to: [destinataire],
        subject: sujet,
        html,
      }),
    });

    if (!reponse.ok) {
      const detail = await reponse.text();
      return { envoye: false, raison: "erreur", detail };
    }

    return { envoye: true };
  } catch (e) {
    return { envoye: false, raison: "erreur", detail: e instanceof Error ? e.message : String(e) };
  }
}
