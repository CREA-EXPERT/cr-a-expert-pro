import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const EntreeSimulation = z.object({
  email: z.string().trim().email().max(255),
  prenom: z.string().trim().max(80).optional(),
  reponses: z.record(z.string(), z.string()),
  resultat: z.string().max(60),
  corps_email: z.string().max(80000),
  /** Journal probatoire : version des textes, empreinte de la restitution servie. */
  journal: z
    .object({
      version_textes: z.string().max(20),
      horodatage: z.string().max(40),
      email: z.string().max(255),
      reponses: z.record(z.string(), z.string()),
      forme_retenue: z.string().max(60),
      empreinte_restitution: z.string().max(64),
    })
    .optional(),
  piege: z.string().max(200).optional(),
});


function ipAppelant() {
  return getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() || "inconnu";
}

/**
 * Enregistre une simulation soumise depuis le formulaire public, protégée par
 * un honeypot et une limitation de fréquence, puis tente l'envoi de l'email
 * de résultat.
 */
export const enregistrerSimulation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EntreeSimulation.parse(input))
  .handler(async ({ data }) => {
    if (data.piege) return { ok: true, id: null, emailEnvoye: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifierLimite } = await import("./antiabus.server");

    const ip = ipAppelant();
    const autorise = await verifierLimite("simulation", ip);
    if (!autorise) return { ok: false as const, raison: "trop_de_demandes" as const };

    const { data: ligne, error } = await supabaseAdmin
      .from("simulations")
      .insert({
        email: data.email,
        prenom: data.prenom || null,
        reponses: {
          reponses: data.reponses,
          ...(data.journal
            ? { journal: { ...data.journal, enregistre_le: new Date().toISOString() } }
            : {}),
        },
        resultat: data.resultat,
        corps_email: data.corps_email,
      })
      .select("id")
      .single();

    if (error || !ligne) return { ok: false as const, raison: "trop_de_demandes" as const };

    const { envoyerResultatSimulation } = await import("./email.functions");
    let emailEnvoye = false;
    try {
      const resultat = await envoyerResultatSimulation({ data: { simulationId: ligne.id } });
      emailEnvoye = resultat.envoye;
    } catch {
      emailEnvoye = false;
    }

    return { ok: true as const, id: ligne.id as string, emailEnvoye };
  });
