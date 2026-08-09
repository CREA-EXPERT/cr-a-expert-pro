import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Déclenchement manuel de la purge — réservé aux administrateurs. */
export const lancerPurge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dryRun?: boolean }) => ({ dryRun: input?.dryRun === true }))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin");
    if (!roles || roles.length === 0) throw new Error("Action réservée à l'administration.");


    const { executerPurge } = await import("@/lib/purge.server");
    return executerPurge({ dryRun: data.dryRun, declencheur: "manuel_admin" });
  });

/** Dernières exécutions journalisées (aucune donnée personnelle). */
export const lireJournalPurge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("journal_purge")
      .select("id, execution_id, date_execution, dry_run, type_donnee, nombre_elements_supprimes, details_techniques")
      .order("date_execution", { ascending: false })
      .limit(60);
    return data ?? [];
  });
