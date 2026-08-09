/**
 * Envoi d'emails transactionnels via Resend, à travers la passerelle de
 * connecteurs Lovable. Serveur uniquement : les clés ne sortent jamais du
 * runtime serveur.
 */
export type ResultatEnvoi =
  | { envoye: true }
  | { envoye: false; raison: "non_configure" }
  | { envoye: false; raison: "erreur"; detail: string };

const PASSERELLE_RESEND = "https://connector-gateway.lovable.dev/resend";

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
  const cleConnexion = process.env["RESEND_API_KEY"];
  const cleLovable = process.env["LOVABLE_API_KEY"];
  if (!cleConnexion || !cleLovable) return { envoye: false, raison: "non_configure" };

  try {
    const reponse = await fetch(`${PASSERELLE_RESEND}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleLovable}`,
        "X-Connection-Api-Key": cleConnexion,
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
      console.error(`Envoi Resend échoué [${reponse.status}] : ${detail}`);
      return { envoye: false, raison: "erreur", detail };
    }


    return { envoye: true };
  } catch (e) {
    return { envoye: false, raison: "erreur", detail: e instanceof Error ? e.message : String(e) };
  }
}
