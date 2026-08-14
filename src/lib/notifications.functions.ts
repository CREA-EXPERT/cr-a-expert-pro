/** Appel client → serveur pour notifier le cabinet d'un événement de conformité. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  dossierId: z.string().uuid(),
  typeEvent: z.string().min(1).max(80),
  motifPrincipal: z.string().max(500).nullable().default(null),
  message: z.string().min(1).max(2000),
});

export const notifierConformite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    // Le dossier doit être visible par l'appelant : la lecture passe par RLS.
    const { data: dossier } = await context.supabase
      .from("dossiers")
      .select("id, denomination")
      .eq("id", data.dossierId)
      .maybeSingle();
    if (!dossier) return { enregistre: false, email: false };

    const { notifierCabinet } = await import("@/lib/notifications.server");
    return notifierCabinet({
      dossierId: dossier.id,
      denomination: dossier.denomination ?? "",
      typeEvent: data.typeEvent,
      motifPrincipal: data.motifPrincipal,
      message: data.message,
    });
  });
