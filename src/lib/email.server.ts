/**
 * Envoi d'emails transactionnels via Resend, à travers la passerelle de
 * connecteurs Lovable. Serveur uniquement : les clés ne sortent jamais du
 * runtime serveur.
 *
 * Lorsqu'un `dossierId` est fourni, l'envoi est journalisé (table
 * `journal_emails`) et, si le dossier est un dossier de test, l'objet est
 * préfixé et le destinataire forcé sur l'adresse du compte de test.
 */
import { preparerEnvoiTest } from "./test-mode";

export type ResultatEnvoi =
  | { envoye: true }
  | { envoye: false; raison: "non_configure" }
  | { envoye: false; raison: "erreur"; detail: string };

const PASSERELLE_RESEND = "https://connector-gateway.lovable.dev/resend";

async function contexteDossier(dossierId: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dossier } = await supabaseAdmin
      .from("dossiers")
      .select("id, user_id, est_test")
      .eq("id", dossierId)
      .maybeSingle();
    if (!dossier) return { estTest: false, emailTest: null as string | null };
    if (!dossier.est_test) return { estTest: false, emailTest: null as string | null };
    const { data: profil } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", dossier.user_id)
      .maybeSingle();
    return { estTest: true, emailTest: (profil?.email as string | undefined) ?? null };
  } catch {
    return { estTest: false, emailTest: null as string | null };
  }
}

async function journaliser(entree: {
  dossier_id: string;
  destinataire: string;
  sujet: string;
  statut: string;
  detail?: string | null;
  test: boolean;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("journal_emails").insert(entree);
  } catch {
    /* le journal ne bloque jamais l'envoi */
  }
}

export async function envoyerEmail({
  destinataire,
  sujet,
  html,
  expediteur,
  dossierId,
  pourCabinet,
}: {
  destinataire: string;
  sujet: string;
  html: string;
  /** Adresse d'expédition ; par défaut l'adresse de contact. */
  expediteur?: string;
  /** Dossier concerné : active la journalisation et les règles du mode test. */
  dossierId?: string | null;
  /** Vrai lorsque le message est une copie destinée au cabinet. */
  pourCabinet?: boolean;
}): Promise<ResultatEnvoi> {
  let sujetFinal = sujet;
  let destinataireFinal = destinataire;
  let estTest = false;

  if (dossierId) {
    const ctx = await contexteDossier(dossierId);
    estTest = ctx.estTest;
    if (estTest && !ctx.emailTest) {
      await journaliser({
        dossier_id: dossierId,
        destinataire,
        sujet,
        statut: "bloque_test",
        detail: "Adresse du compte de test inconnue : aucun envoi.",
        test: true,
      });
      return { envoye: false, raison: "erreur", detail: "adresse_test_inconnue" };
    }
    const prepare = preparerEnvoiTest({
      sujet,
      destinataire,
      estTest,
      emailTest: ctx.emailTest,
      pourCabinet: pourCabinet === true,
    });
    sujetFinal = prepare.sujet;
    destinataireFinal = prepare.destinataire;
  }

  const cleConnexion = process.env["RESEND_API_KEY"];
  const cleLovable = process.env["LOVABLE_API_KEY"];
  if (!cleConnexion || !cleLovable) {
    if (dossierId)
      await journaliser({
        dossier_id: dossierId,
        destinataire: destinataireFinal,
        sujet: sujetFinal,
        statut: "non_configure",
        test: estTest,
      });
    return { envoye: false, raison: "non_configure" };
  }

  try {
    const reponse = await fetch(`${PASSERELLE_RESEND}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleLovable}`,
        "X-Connection-Api-Key": cleConnexion,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: expediteur ?? "CREA EXPERT <contact@crea-expert.fr>",
        to: [destinataireFinal],
        subject: sujetFinal,
        html,
      }),
    });

    if (!reponse.ok) {
      const detail = await reponse.text();
      console.error(`Envoi Resend échoué [${reponse.status}] : ${detail}`);
      if (dossierId)
        await journaliser({
          dossier_id: dossierId,
          destinataire: destinataireFinal,
          sujet: sujetFinal,
          statut: "echec",
          detail: detail.slice(0, 500),
          test: estTest,
        });
      return { envoye: false, raison: "erreur", detail };
    }

    if (dossierId)
      await journaliser({
        dossier_id: dossierId,
        destinataire: destinataireFinal,
        sujet: sujetFinal,
        statut: "envoye",
        test: estTest,
      });

    return { envoye: true };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    if (dossierId)
      await journaliser({
        dossier_id: dossierId,
        destinataire: destinataireFinal,
        sujet: sujetFinal,
        statut: "echec",
        detail: detail.slice(0, 500),
        test: estTest,
      });
    return { envoye: false, raison: "erreur", detail };
  }
}
