import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Entree = z.object({ documentId: z.string().uuid() });

export type RetourVerification = {
  lance: boolean;
  synthese: "conforme" | "doute" | "non_conforme" | null;
  controles: { type_controle: string; resultat: string; motif: string }[];
  erreur: string | null;
};

/** Catégorie de contrôle applicable à une pièce, ou null si le robot ne s'applique pas. */
export function categorieControle(typeDocument: string): "identite" | "domicile" | null {
  if (typeDocument === "piece_identite" || typeDocument.startsWith("identite_")) return "identite";
  if (typeDocument === "justificatif_domicile") return "domicile";
  return null;
}

/**
 * Vérification automatique d'une pièce déposée. Aide au contrôle : le résultat
 * n'est jamais une validation définitive, la revue humaine reste maîtresse.
 */
export const verifierPiece = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Entree.parse(input))
  .handler(async ({ data, context }): Promise<RetourVerification> => {
    const vide: Omit<RetourVerification, "erreur"> = {
      lance: false,
      synthese: null,
      controles: [],
    };

    // Lecture sous RLS : garantit que l'appelant a bien accès à cette pièce.
    const { data: doc } = await context.supabase
      .from("documents")
      .select(
        "id, dossier_id, associe_id, type_document, libelle, fichier_url, fichier_verso_url, date_expiration",
      )
      .eq("id", data.documentId)
      .maybeSingle();
    if (!doc || !doc.fichier_url) return { ...vide, erreur: "Pièce introuvable ou non déposée." };

    const categorie = categorieControle(doc.type_document);
    if (!categorie) return { ...vide, erreur: null };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { analyserPiece } = await import("./verification.server");

    await supabaseAdmin
      .from("documents")
      .update({ verification_statut: "en_cours" })
      .eq("id", doc.id);

    const chemins = [doc.fichier_url, doc.fichier_verso_url].filter(Boolean) as string[];
    const fichiers: { base64: string; mime: string }[] = [];
    for (const chemin of chemins) {
      const { data: blob } = await supabaseAdmin.storage.from("documents").download(chemin);
      if (!blob) continue;
      const buffer = Buffer.from(await blob.arrayBuffer());
      const ext = chemin.split(".").pop()?.toLowerCase() ?? "";
      const mime =
        ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg";
      fichiers.push({ base64: buffer.toString("base64"), mime });
    }

    if (fichiers.length === 0) {
      await supabaseAdmin
        .from("documents")
        .update({ verification_statut: "indisponible" })
        .eq("id", doc.id);
      return { ...vide, erreur: "Le fichier n'a pas pu être lu." };
    }

    let contexte = `Pièce attendue : ${doc.libelle}.`;
    if (categorie === "identite" && doc.associe_id) {
      const { data: associe } = await supabaseAdmin
        .from("associes")
        .select("prenom, prenoms, nom, nom_naissance, date_naissance")
        .eq("id", doc.associe_id)
        .maybeSingle();
      if (associe) {
        const prenoms = [associe.prenom, ...(associe.prenoms ?? [])].filter(Boolean).join(" ");
        contexte +=
          ` Données déclarées : nom « ${associe.nom ?? ""} »` +
          (associe.nom_naissance ? ` (nom de naissance « ${associe.nom_naissance} »)` : "") +
          `, prénom(s) « ${prenoms} », date de naissance ${associe.date_naissance ?? "non renseignée"}.`;
      }
    }
    if (doc.date_expiration) contexte += ` Date d'expiration déclarée : ${doc.date_expiration}.`;

    const { sortie, erreur } = await analyserPiece({ categorie, fichiers, contexte });
    if (!sortie) {
      await supabaseAdmin
        .from("documents")
        .update({ verification_statut: "indisponible" })
        .eq("id", doc.id);
      return { ...vide, erreur };
    }

    await supabaseAdmin.from("verifications_pieces").insert(
      sortie.controles.map((c) => ({
        document_id: doc.id,
        dossier_id: doc.dossier_id,
        type_controle: c.type_controle,
        resultat: c.resultat,
        motif: c.motif,
        modele: sortie.modele,
      })),
    );

    const motifs = sortie.controles
      .filter((c) => c.resultat !== "conforme")
      .map((c) => c.motif)
      .filter(Boolean)
      .join(" ");

    if (sortie.synthese === "non_conforme") {
      await supabaseAdmin
        .from("documents")
        .update({
          statut_document: "a_corriger",
          motif_rejet: motifs || "La vérification automatique a détecté une anomalie.",
          verification_statut: "non_conforme",
        })
        .eq("id", doc.id);
    } else {
      await supabaseAdmin
        .from("documents")
        .update({
          statut_document: sortie.synthese === "doute" ? "en_revue" : "depose",
          verification_statut: sortie.synthese,
        })
        .eq("id", doc.id);
    }

    await supabaseAdmin.from("events_dossier").insert({
      dossier_id: doc.dossier_id,
      type_event: "verification_automatique",
      message:
        `Vérification automatique de « ${doc.libelle} » : ${
          sortie.synthese === "conforme"
            ? "aucune anomalie détectée"
            : sortie.synthese === "doute"
              ? "points à confirmer en revue humaine"
              : "anomalie détectée"
        }.` + (motifs ? ` ${motifs}` : ""),
    });

    return {
      lance: true,
      synthese: sortie.synthese,
      controles: sortie.controles,
      erreur: null,
    };
  });
