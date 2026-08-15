/**
 * « Coulisses » d'un dossier de test : inventaire du stockage, des emails,
 * des statuts et des signatures. Serveur uniquement (clé de service).
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { BUCKET_DOCUMENTS, BUCKET_KYC } from "./conservation";

export const BUCKETS_COULISSES = [BUCKET_DOCUMENTS, BUCKET_KYC] as const;

export type FichierCoulisses = {
  bucket: string;
  chemin: string;
  taille: number | null;
  horodatage: string | null;
  url: string | null;
};

/** Liste récursive des objets d'un préfixe (profondeur volontairement bornée). */
export async function listerFichiers(
  bucket: string,
  prefixe: string,
  profondeur = 0,
): Promise<{ chemin: string; taille: number | null; horodatage: string | null }[]> {
  if (profondeur > 3) return [];
  const { data, error } = await supabaseAdmin.storage.from(bucket).list(prefixe, { limit: 200 });
  if (error || !data) return [];
  const resultats: { chemin: string; taille: number | null; horodatage: string | null }[] = [];
  for (const entree of data) {
    const chemin = prefixe ? `${prefixe}/${entree.name}` : entree.name;
    const taille = (entree.metadata as { size?: number } | null)?.size ?? null;
    if (entree.id === null && taille === null) {
      resultats.push(...(await listerFichiers(bucket, chemin, profondeur + 1)));
    } else {
      resultats.push({
        chemin,
        taille,
        horodatage: entree.updated_at ?? entree.created_at ?? null,
      });
    }
  }
  return resultats;
}

export async function coulissesDossier(dossierId: string) {
  const fichiers: FichierCoulisses[] = [];
  for (const bucket of BUCKETS_COULISSES) {
    const objets = await listerFichiers(bucket, dossierId);
    for (const o of objets) {
      const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrl(o.chemin, 900);
      fichiers.push({
        bucket,
        chemin: o.chemin,
        taille: o.taille,
        horodatage: o.horodatage,
        url: data?.signedUrl ?? null,
      });
    }
  }

  const { data: emails } = await supabaseAdmin
    .from("journal_emails")
    .select("id, destinataire, sujet, statut, detail, created_at")
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: statuts } = await supabaseAdmin
    .from("events_dossier")
    .select("id, type_event, message, created_at")
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: signatures } = await supabaseAdmin
    .from("signatures_electroniques")
    .select("id, libelle, statut, envoye_le, signe_le, fichier_signe")
    .eq("dossier_id", dossierId)
    .order("ordre");

  const ids = (signatures ?? []).map((s) => s.id);
  const { data: signataires } = ids.length
    ? await supabaseAdmin
        .from("signatures_signataires")
        .select(
          "id, signature_id, signataire_nom, methode, horodatage, envoye_le, dernier_resultat, hash_document",
        )
        .in("signature_id", ids)
    : { data: [] };

  return {
    fichiers,
    emails: emails ?? [],
    statuts: statuts ?? [],
    signatures: (signatures ?? []).map((s) => ({
      ...s,
      signataires: (signataires ?? []).filter((x) => x.signature_id === s.id),
    })),
  };
}
