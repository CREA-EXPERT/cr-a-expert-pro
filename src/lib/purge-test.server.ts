/**
 * Purge des dossiers de test. Strictement distincte de la purge réglementaire
 * (`purge.server.ts`) : elle ne s'applique qu'aux dossiers `est_test = true`.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { BUCKETS_COULISSES, listerFichiers } from "./coulisses.server";

/** Tables filles supprimées avant le dossier lui-même. */
const TABLES_LIEES = [
  "verifications_pieces",
  "journal_emails_signature",
  "signatures_electroniques",
  "dossier_kyc",
  "traces_verification_identite",
  "relances_pieces",
  "motifs_rejet_greffe",
  "notifications_cabinet",
  "refacturations_intragroupe",
  "events_dossier",
  "documents",
  "associes",
  "journal_emails",
  "demandes_contact",
] as const;

export async function purgerDossierTest(dossierId: string) {
  const { data: dossier, error } = await supabaseAdmin
    .from("dossiers")
    .select("id, est_test, denomination")
    .eq("id", dossierId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!dossier) throw new Error("Dossier introuvable.");
  if (!dossier.est_test) throw new Error("Ce dossier n'est pas un dossier de test.");

  let fichiersSupprimes = 0;
  for (const bucket of BUCKETS_COULISSES) {
    const objets = await listerFichiers(bucket, dossierId);
    if (objets.length === 0) continue;
    const chemins = objets.map((o) => o.chemin);
    const { error: err } = await supabaseAdmin.storage.from(bucket).remove(chemins);
    if (!err) fichiersSupprimes += chemins.length;
  }

  // signatures_signataires est rattaché au dossier via signatures_electroniques.
  const { data: signatures } = await supabaseAdmin
    .from("signatures_electroniques")
    .select("id")
    .eq("dossier_id", dossierId);
  const idsSignatures = (signatures ?? []).map((s) => s.id);
  if (idsSignatures.length) {
    await supabaseAdmin.from("signatures_signataires").delete().in("signature_id", idsSignatures);
  }

  for (const table of TABLES_LIEES) {
    await supabaseAdmin
      .from(table as "documents")
      .delete()
      .eq("dossier_id", dossierId);
  }

  const { error: errDossier } = await supabaseAdmin.from("dossiers").delete().eq("id", dossierId);
  if (errDossier) throw new Error(errDossier.message);

  return { dossierId, denomination: dossier.denomination, fichiersSupprimes };
}

export async function listerDossiersTest() {
  const { data, error } = await supabaseAdmin
    .from("dossiers")
    .select("id, denomination, forme_juridique, statut, created_at, user_id, documents_plus_tard")
    .eq("est_test", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
