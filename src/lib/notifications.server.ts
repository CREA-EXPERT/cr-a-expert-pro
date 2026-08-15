/**
 * Notifications internes au cabinet sur la conformité des dossiers :
 * enregistrement in-app systématique et email récapitulatif au plus une fois
 * par dossier et par jour. Serveur uniquement.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { envoyerEmail } from "@/lib/email.server";
import { EMAIL_CABINET } from "@/lib/config";

const EXPEDITEUR = "CREA EXPERT <contact@crea-expert.fr>";

export type EvenementConformite = {
  dossierId: string;
  denomination: string;
  typeEvent: string;
  motifPrincipal: string | null;
  message: string;
};

function debutDeJournee() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Destinataire unique des notifications internes : la boîte du cabinet.
 * Les emails des comptes admin ou de démonstration ne sont jamais utilisés.
 */
function destinatairesCabinet(): string[] {
  return [EMAIL_CABINET];
}

function corps(denomination: string, lien: string, evenements: { message: string }[]) {
  const items = evenements.map((e) => `<li>${e.message}</li>`).join("");
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937">
  <p>Dossier <strong>${denomination || "sans nom"}</strong> — événements de conformité du jour :</p>
  <ul>${items}</ul>
  <p><a href="${lien}">Ouvrir le dossier</a></p>
  <p style="color:#6b7280;font-size:12px">Message automatique — CREA EXPERT.</p>
</div>`;
}

/**
 * Consigne la notification puis, si aucun email n'a été envoyé pour ce dossier
 * dans la journée, adresse un récapitulatif au cabinet.
 */
export async function notifierCabinet(evenement: EvenementConformite) {
  const { data: insere, error } = await supabaseAdmin
    .from("notifications_cabinet")
    .insert({
      dossier_id: evenement.dossierId,
      denomination: evenement.denomination,
      type_event: evenement.typeEvent,
      motif_principal: evenement.motifPrincipal,
      message: evenement.message,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[notifications] insertion impossible", error);
    return { enregistre: false, email: false };
  }

  const depuis = debutDeJournee();
  const { data: dejaEnvoye } = await supabaseAdmin
    .from("notifications_cabinet")
    .select("id")
    .eq("dossier_id", evenement.dossierId)
    .gte("created_at", depuis)
    .not("email_envoye_le", "is", null)
    .limit(1);
  if ((dejaEnvoye ?? []).length > 0) return { enregistre: true, email: false };

  const { data: duJour } = await supabaseAdmin
    .from("notifications_cabinet")
    .select("message")
    .eq("dossier_id", evenement.dossierId)
    .gte("created_at", depuis)
    .order("created_at", { ascending: true });

  const destinataires = destinatairesCabinet();
  if (destinataires.length === 0) return { enregistre: true, email: false };

  const base = process.env["APP_URL"] ?? "https://crea-expert.lovable.app";
  const lien = `${base}/cabinet/${evenement.dossierId}`;
  const html = corps(evenement.denomination, lien, duJour ?? [{ message: evenement.message }]);

  let envoye = false;
  for (const destinataire of destinataires) {
    const resultat = await envoyerEmail({
      destinataire,
      sujet: `Conformité — ${evenement.denomination || "dossier"}`,
      html,
      expediteur: EXPEDITEUR,
      dossierId: evenement.dossierId,
      pourCabinet: true,
    });
    envoye = envoye || resultat.envoye;
  }

  if (envoye) {
    await supabaseAdmin
      .from("notifications_cabinet")
      .update({ email_envoye_le: new Date().toISOString() })
      .eq("id", insere.id);
  }
  return { enregistre: true, email: envoye };
}
