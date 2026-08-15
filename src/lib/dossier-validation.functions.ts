import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validerContratMariage } from "@/lib/contrat-mariage";

/**
 * Transmission du dossier au cabinet, contrôlée côté serveur.
 * Les règles du contrat de mariage (étude notariale, notaire, date réelle et
 * non future) sont revalidées ici : une soumission qui contournerait le
 * formulaire est refusée.
 */
export const transmettreDossier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dossierId: string }) =>
    z.object({ dossierId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: dossier, error } = await supabase
      .from("dossiers")
      .select("id, statut")
      .eq("id", data.dossierId)
      .maybeSingle();
    if (error || !dossier) return { ok: false as const, erreurs: ["Dossier introuvable."] };

    const { data: associes } = await supabase
      .from("associes")
      .select(
        "id, prenom, nom, contrat_mariage, contrat_mariage_etude, contrat_mariage_notaire, contrat_mariage_date",
      )
      .eq("dossier_id", dossier.id);

    const erreurs: string[] = [];
    for (const a of associes ?? []) {
      const err = validerContratMariage(a);
      const messages = Object.values(err);
      if (messages.length === 0) continue;
      const qui = `${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "Associé sans nom";
      erreurs.push(`${qui} — contrat de mariage : ${messages.join(" ")}`);
    }

    if (erreurs.length > 0) {
      await supabase.from("events_dossier").insert({
        dossier_id: dossier.id,
        type_event: "transmission_refusee",
        message: `Transmission refusée par le contrôle serveur : ${erreurs.join(" ; ")}`,
      });
      return { ok: false as const, erreurs };
    }

    await supabase.from("dossiers").update({ statut: "en_revue_cabinet" }).eq("id", dossier.id);
    await supabase.from("events_dossier").insert({
      dossier_id: dossier.id,
      type_event: "pieces_transmises",
      message:
        "Dossier transmis au cabinet après vérification finale par le client : identités, siège, capital, objet social et pièces contrôlés.",
    });
    return { ok: true as const, erreurs: [] as string[] };
  });
