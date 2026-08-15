/**
 * Boîte de réception de test, côté serveur.
 *
 * Le renvoi permet de faire partir réellement un message qui avait été
 * intercepté : l'appel à la passerelle Resend est fait directement, en
 * contournant l'interception, et le résultat est journalisé.
 */
const PASSERELLE_RESEND = "https://connector-gateway.lovable.dev/resend";

export type ResultatRenvoi =
  | { envoye: true }
  | { envoye: false; raison: "introuvable" | "non_configure" | "erreur"; detail?: string };

export async function renvoyerEmailIntercepte(id: string): Promise<ResultatRenvoi> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: email } = await supabaseAdmin
    .from("emails_test")
    .select("id, dossier_id, destinataire, sujet, corps")
    .eq("id", id)
    .maybeSingle();
  if (!email) return { envoye: false, raison: "introuvable" };

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
        from: "CREA EXPERT <contact@crea-expert.fr>",
        to: [email.destinataire],
        subject: email.sujet,
        html: email.corps,
      }),
    });
    if (!reponse.ok) {
      const detail = (await reponse.text()).slice(0, 500);
      return { envoye: false, raison: "erreur", detail };
    }
    if (email.dossier_id) {
      await supabaseAdmin.from("journal_emails").insert({
        dossier_id: email.dossier_id,
        destinataire: email.destinataire,
        sujet: email.sujet,
        statut: "renvoye_hors_test",
        test: false,
      });
    }
    return { envoye: true };
  } catch (e) {
    return { envoye: false, raison: "erreur", detail: e instanceof Error ? e.message : String(e) };
  }
}
