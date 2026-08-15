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
  du: z.string().max(10).optional(),
  au: z.string().max(10).optional(),
  page: z.number().int().min(1).default(1),
  parPage: z.number().int().min(5).max(200).default(25),
});

export const listerEmailsTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => filtres.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    await verifierAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const debut = (data.page - 1) * data.parPage;
    let requete = supabaseAdmin
      .from("emails_test")
      .select("id, dossier_id, destinataire, sujet, corps, tag, pour_cabinet, ordre, created_at", {
        count: "exact",
      })
      .order("ordre", { ascending: false })
      .range(debut, debut + data.parPage - 1);
    if (data.dossierId) requete = requete.eq("dossier_id", data.dossierId);
    if (data.tag) requete = requete.eq("tag", data.tag);
    if (data.recherche) requete = requete.ilike("destinataire", `%${data.recherche}%`);
    if (data.du) requete = requete.gte("created_at", `${data.du}T00:00:00Z`);
    if (data.au) requete = requete.lte("created_at", `${data.au}T23:59:59Z`);

    const { data: emails, error, count } = await requete;
    if (error) throw new Error(error.message);
    return { emails: emails ?? [], total: count ?? 0, page: data.page, parPage: data.parPage };
  });

export const reenvoyerEmailTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await verifierAdmin(context.supabase as never, context.userId);
    const { renvoyerEmailIntercepte } = await import("./emails-test.server");
    return renvoyerEmailIntercepte(data.id);
  });

/** Purge des messages interceptés rattachés aux dossiers de test. */
export const purgerEmailsTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ confirmation: z.literal("PURGER") }).parse(data))
  .handler(async ({ context }) => {
    await verifierAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: dossiers, error: e1 } = await supabaseAdmin
      .from("dossiers")
      .select("id")
      .eq("est_test", true);
    if (e1) throw new Error(e1.message);
    const ids = (dossiers ?? []).map((d: { id: string }) => d.id);
    if (ids.length === 0) return { supprimes: 0 };

    const { data: supprimes, error: e2 } = await supabaseAdmin
      .from("emails_test")
      .delete()
      .in("dossier_id", ids)
      .select("id");
    if (e2) throw new Error(e2.message);
    return { supprimes: (supprimes ?? []).length };
  });
