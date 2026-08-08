import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Entree = z.object({ simulationId: z.string().uuid() });

function echapperHtml(texte: string) {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function texteVersHtml(texte: string) {
  return echapperHtml(texte)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

/**
 * Envoie par email le résultat d'une simulation déjà enregistrée en base,
 * puis trace le résultat de l'envoi sur la ligne correspondante.
 */
export const envoyerResultatSimulation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Entree.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { envoyerEmail } = await import("./email.server");

    const { data: simulation, error } = await supabaseAdmin
      .from("simulations")
      .select("id, email, corps_email")
      .eq("id", data.simulationId)
      .maybeSingle();

    if (error || !simulation || !simulation.corps_email) return { envoye: false };

    const resultat = await envoyerEmail({
      destinataire: simulation.email,
      sujet: "Votre résultat — quelle forme juridique pour votre projet ?",
      html: texteVersHtml(simulation.corps_email),
    });

    if (resultat.envoye) {
      await supabaseAdmin
        .from("simulations")
        .update({ email_envoye_le: new Date().toISOString() })
        .eq("id", simulation.id);
      return { envoye: true };
    }

    await supabaseAdmin
      .from("simulations")
      .update({ email_erreur: resultat.raison === "erreur" ? resultat.detail : resultat.raison })
      .eq("id", simulation.id);
    return { envoye: false };
  });
