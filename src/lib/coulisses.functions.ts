/** Lecture des « coulisses » d'un dossier (stockage, emails, statuts, signatures). */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({ dossierId: z.string().uuid() });

export const lireCoulisses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    // Visibilité contrôlée par RLS : propriétaire du dossier, cabinet ou admin.
    const { data: dossier } = await context.supabase
      .from("dossiers")
      .select("id, est_test")
      .eq("id", data.dossierId)
      .maybeSingle();
    if (!dossier) throw new Error("Dossier introuvable.");

    const { coulissesDossier } = await import("./coulisses.server");
    return coulissesDossier(data.dossierId);
  });
