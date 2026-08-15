/** Déclenchement client → serveur des emails d'étape du dossier. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  dossierId: z.string().uuid(),
  etape: z.enum(["ouvert", "transmis"]),
});

export const envoyerEmailEtape = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    // Le dossier doit être visible par l'appelant : la lecture passe par RLS.
    const { data: dossier } = await context.supabase
      .from("dossiers")
      .select("id")
      .eq("id", data.dossierId)
      .maybeSingle();
    if (!dossier) return { envoye: false };

    const { emailDossierOuvert, emailDossierTransmis } = await import("./emails-etape.server");
    return data.etape === "ouvert"
      ? emailDossierOuvert(data.dossierId)
      : emailDossierTransmis(data.dossierId);
  });
