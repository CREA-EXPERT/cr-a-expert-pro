/**
 * Consultation de la boîte de réception de test (rôle administrateur).
 *
 * Ces fonctions alimentent la page d'administration : lecture filtrable des
 * emails interceptés et re-tentative d'envoi réel d'un message donné, hors
 * interception, lorsque le message doit finalement partir.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ClientRole = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (
        c: string,
        v: string,
      ) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> } };
    };
  };
};

async function verifierAdmin(supabase: ClientRole, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Action réservée à l'administrateur.");
}

const filtres = z.object({
  dossierId: z.string().uuid().optional(),
  tag: z.string().max(60).optional(),
  recherche: z.string().max(160).optional(),
});

export const listerEmailsTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => filtres.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    await verifierAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let requete = supabaseAdmin
      .from("emails_test")
      .select("id, dossier_id, destinataire, sujet, corps, tag, pour_cabinet, ordre, created_at")
      .order("ordre", { ascending: false })
      .limit(300);
    if (data.dossierId) requete = requete.eq("dossier_id", data.dossierId);
    if (data.tag) requete = requete.eq("tag", data.tag);
    if (data.recherche) requete = requete.ilike("destinataire", `%${data.recherche}%`);

    const { data: emails, error } = await requete;
    if (error) throw new Error(error.message);
    return { emails: emails ?? [] };
  });

export const reenvoyerEmailTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await verifierAdmin(context.supabase as never, context.userId);
    const { renvoyerEmailIntercepte } = await import("./emails-test.server");
    return renvoyerEmailIntercepte(data.id);
  });
