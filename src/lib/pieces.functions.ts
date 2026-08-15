import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EntreeLiens = z.object({ dossierId: z.string().uuid() });

const EntreeDecision = z.object({
  documentId: z.string().uuid(),
  decision: z.enum(["en_revue", "valide", "a_corriger", "refuse"]),
  motif: z.string().trim().max(1000).optional(),
});

type ClientAuthentifie = {
  from: (table: "user_roles") => {
    select: (colonnes: string) => {
      eq: (
        colonne: string,
        valeur: string,
      ) => {
        in: (colonne: string, valeurs: string[]) => Promise<{ data: unknown[] | null }>;
      };
    };
  };
};

/** Vrai si l'utilisateur appartient au cabinet ou à l'équipe CREA EXPERT. */
async function verifierHabilitation(supabase: ClientAuthentifie, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["cabinet", "admin"]);
  if (!data || data.length === 0) throw new Error("Accès réservé au cabinet.");
}

/**
 * Liens signés temporaires, générés EN LOT pour l'aperçu des pièces d'un dossier.
 * Réservé aux rôles habilités : jamais accessible au client.
 */
export const liensPiecesDossier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EntreeLiens.parse(input))
  .handler(async ({ data, context }) => {
    await verifierHabilitation(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: docs } = await supabaseAdmin
      .from("documents")
      .select("id, fichier_url")
      .eq("dossier_id", data.dossierId)
      .not("fichier_url", "is", null);

    const chemins = (docs ?? []).map((d) => d.fichier_url as string);
    if (chemins.length === 0) return { liens: {} as Record<string, string> };

    const { data: signes } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrls(chemins, 900);

    const parChemin = new Map<string, string>();
    for (const s of signes ?? []) {
      if (s.path && s.signedUrl) parChemin.set(s.path, s.signedUrl);
    }

    const liens: Record<string, string> = {};
    for (const d of docs ?? []) {
      const url = parChemin.get(d.fichier_url as string);
      if (url) liens[d.id] = url;
    }
    return { liens };
  });

/**
 * Décision de revue sur une pièce : validation, demande de correction ou refus.
 * Notifie le client par email en cas de correction ou de refus.
 */
export const deciderPiece = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EntreeDecision.parse(input))
  .handler(async ({ data, context }) => {
    await verifierHabilitation(context.supabase as never, context.userId);

    const motif = (data.motif ?? "").trim();
    if ((data.decision === "a_corriger" || data.decision === "refuse") && motif.length < 5) {
      throw new Error("Le motif est obligatoire (5 caractères minimum).");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: doc } = await supabaseAdmin
      .from("documents")
      .select("id, libelle, dossier_id")
      .eq("id", data.documentId)
      .maybeSingle();
    if (!doc) throw new Error("Pièce introuvable.");

    const { error } = await supabaseAdmin
      .from("documents")
      .update({
        statut_document: data.decision,
        motif_rejet: data.decision === "a_corriger" || data.decision === "refuse" ? motif : null,
        valide_le: data.decision === "valide" ? new Date().toISOString() : null,
      })
      .eq("id", data.documentId);
    if (error) throw new Error("La mise à jour de la pièce a échoué.");

    const messages: Record<string, string> = {
      en_revue: `Pièce prise en revue par le cabinet : ${doc.libelle}.`,
      valide: `Pièce validée par le cabinet : ${doc.libelle}.`,
      a_corriger: `Pièce à corriger — ${doc.libelle} : ${motif}`,
      refuse: `Pièce refusée — ${doc.libelle} : ${motif}`,
    };
    await supabaseAdmin.from("events_dossier").insert({
      dossier_id: doc.dossier_id,
      type_event: "revue_piece",
      message: messages[data.decision] as string,
    });

    let emailEnvoye = false;
    if (data.decision === "a_corriger" || data.decision === "refuse") {
      const { data: dossier } = await supabaseAdmin
        .from("dossiers")
        .select("user_id, denomination")
        .eq("id", doc.dossier_id)
        .maybeSingle();
      const { data: profil } = dossier
        ? await supabaseAdmin
            .from("profiles")
            .select("email")
            .eq("id", dossier.user_id)
            .maybeSingle()
        : { data: null };

      if (profil?.email) {
        const { envoyerEmail } = await import("./email.server");
        const titre = data.decision === "refuse" ? "Pièce refusée" : "Pièce à corriger";
        const resultat = await envoyerEmail({
          destinataire: profil.email,
          sujet: `${titre} — votre dossier de création`,
          html: `<p>Bonjour,</p><p>Lors de la revue de votre dossier${
            dossier?.denomination ? ` « ${echapper(dossier.denomination)} »` : ""
          }, la pièce suivante appelle une action de votre part :</p><p><strong>${echapper(
            doc.libelle,
          )}</strong> — ${titre.toLowerCase()}.</p><p>Motif indiqué par le cabinet : ${echapper(
            motif,
          )}</p><p>Connectez-vous à votre espace « Mes documents » pour déposer une nouvelle version.</p><p>CREA EXPERT</p>`,
          dossierId: doc.dossier_id,
        });
        emailEnvoye = resultat.envoye;
      }
    }

    return { ok: true, emailEnvoye };
  });

function echapper(texte: string) {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
