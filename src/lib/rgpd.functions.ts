import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Export des données personnelles de l'utilisateur connecté (art. 15 et 20 RGPD).
 * Lecture via le client authentifié : la RLS garantit le périmètre du compte.
 */
export const exporterMesDonnees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profil }, { data: dossiers }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("dossiers").select("*").eq("user_id", userId),
    ]);

    const ids = (dossiers ?? []).map((d) => d.id);
    const vide = ids.length === 0;

    const [associes, documents, signatures, evenements, rappels] = await Promise.all([
      vide ? { data: [] } : supabase.from("associes").select("*").in("dossier_id", ids),
      vide
        ? { data: [] }
        : supabase
            .from("documents")
            .select(
              "id, dossier_id, type_document, libelle, obligatoire, origine, statut_document, depose_le, atteste_conforme, atteste_le, valide_le, created_at, updated_at",
            )
            .in("dossier_id", ids),
      vide ? { data: [] } : supabase.from("signatures_electroniques").select("*").in("dossier_id", ids),
      vide ? { data: [] } : supabase.from("events_dossier").select("*").in("dossier_id", ids),
      supabase.from("callbacks").select("*").eq("user_id", userId),
    ]);

    return {
      genere_le: new Date().toISOString(),
      note:
        "Export des données personnelles associées à votre compte CREA EXPERT. Les pièces justificatives elles-mêmes restent téléchargeables depuis votre espace « Mes documents » ; seules leurs métadonnées figurent ici.",
      profil: profil ?? null,
      dossiers: dossiers ?? [],
      associes: associes.data ?? [],
      documents: documents.data ?? [],
      signatures: signatures.data ?? [],
      evenements: evenements.data ?? [],
      demandes_de_rappel: rappels.data ?? [],
    };
  });

/**
 * Suppression du compte (art. 17 RGPD).
 * Les données de facturation soumises à conservation légale (10 ans) sont
 * conservées de façon dissociée dans `archives_facturation`, sans identité.
 */
export const supprimerMonCompte = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: dossiers } = await supabase.from("dossiers").select("*").eq("user_id", userId);
    const ids = (dossiers ?? []).map((d) => d.id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Conservation comptable dissociée (aucune donnée d'identification).
    if ((dossiers ?? []).length > 0) {
      await supabaseAdmin.from("archives_facturation").insert(
        (dossiers ?? []).map((d) => ({
          dossier_ref: d.id,
          denomination: d.denomination ?? "",
          forme_juridique: d.forme_juridique ?? "",
          relecture_statut: d.relecture_statut ?? null,
          moyen_de_paiement_enregistre: d.moyen_de_paiement_enregistre ?? false,
          lettre_mission_acceptee_le: d.lettre_mission_acceptee_le ?? null,
          dossier_cree_le: d.created_at ?? null,
        })),
      );
    }

    // 2. Suppression des pièces dans le stockage privé.
    if (ids.length > 0) {
      for (const id of ids) {
        const { data: fichiers } = await supabaseAdmin.storage.from("documents").list(id);
        const chemins = (fichiers ?? []).map((f) => `${id}/${f.name}`);
        if (chemins.length > 0) await supabaseAdmin.storage.from("documents").remove(chemins);
      }
    }

    // 3. Suppression des données non soumises à conservation légale.
    if (ids.length > 0) {
      await supabaseAdmin.from("documents").delete().in("dossier_id", ids);
      await supabaseAdmin.from("signatures_electroniques").delete().in("dossier_id", ids);
      await supabaseAdmin.from("events_dossier").delete().in("dossier_id", ids);
      await supabaseAdmin.from("associes").delete().in("dossier_id", ids);
      await supabaseAdmin.from("dossiers").delete().in("id", ids);
    }
    await supabaseAdmin.from("callbacks").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    // 4. Suppression du compte d'authentification.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("La suppression du compte n'a pas pu être menée à son terme.");

    return { supprime: true, dossiers_supprimes: ids.length };
  });
