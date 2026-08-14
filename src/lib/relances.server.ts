/**
 * Relance courtoise des pièces manquantes, exécutée quotidiennement par le planificateur.
 * Une relance par semaine et par dossier, trois au maximum, jamais sur un dossier
 * clos, transmis ou immatriculé. Serveur uniquement.
 */
import { TEXTE_AVERTISSEMENT_REJET_SERVEUR } from "./relances.texte";

const STATUTS_ACTIFS = ["brouillon", "dossier_valide_client", "pieces_en_cours"];
const DELAI_JOURS = 7;
const MAX_RELANCES = 3;

export type ResultatRelances = {
  dossiers_examines: number;
  relances_envoyees: number;
  ignores: number;
};

export async function relancerPiecesManquantes(
  origine: string,
  dryRun = false,
): Promise<ResultatRelances> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { envoyerEmail } = await import("./email.server");

  const seuil = new Date(Date.now() - DELAI_JOURS * 86_400_000).toISOString();

  const { data: dossiers } = await supabaseAdmin
    .from("dossiers")
    .select("id, user_id, denomination, statut, denomination_risque")
    .in("statut", STATUTS_ACTIFS);

  let envoyees = 0;
  let ignores = 0;

  for (const d of dossiers ?? []) {
    const { data: docs } = await supabaseAdmin
      .from("documents")
      .select("libelle, statut_document, fichier_url, obligatoire, updated_at")
      .eq("dossier_id", d.id)
      .eq("origine", "a_fournir");

    const attendues = (docs ?? []).filter(
      (doc) =>
        doc.obligatoire &&
        (!doc.fichier_url || ["a_corriger", "refuse", "rejete"].includes(doc.statut_document)) &&
        (doc.updated_at ?? "") < seuil,
    );
    if (attendues.length === 0) {
      ignores += 1;
      continue;
    }

    const { data: relances } = await supabaseAdmin
      .from("relances_pieces")
      .select("envoye_le")
      .eq("dossier_id", d.id)
      .order("envoye_le", { ascending: false });

    if ((relances ?? []).length >= MAX_RELANCES) {
      ignores += 1;
      continue;
    }
    const derniere = relances?.[0]?.envoye_le;
    if (derniere && new Date(derniere).getTime() > Date.now() - 7 * 86_400_000) {
      ignores += 1;
      continue;
    }

    const { data: profil } = await supabaseAdmin
      .from("profiles")
      .select("email, prenom")
      .eq("id", d.user_id)
      .maybeSingle();
    if (!profil?.email) {
      ignores += 1;
      continue;
    }

    const liste = attendues.map((a) => `<li>${echapper(a.libelle)}</li>`).join("");
    if (!dryRun) {
      const resultat = await envoyerEmail({
        destinataire: profil.email,
        sujet: "Il reste des pièces à déposer pour votre création de société",
        html:
          `<p>Bonjour${profil.prenom ? ` ${echapper(profil.prenom)}` : ""},</p>` +
          `<p>Votre dossier de création${d.denomination ? ` « ${echapper(d.denomination)} »` : ""} est en attente de quelques pièces :</p>` +
          `<ul>${liste}</ul>` +
          `<p>Rappels utiles : la copie de pièce d'identité doit porter la mention manuscrite de conformité, datée et signée, et la pièce doit être en cours de validité ; le justificatif de domicile doit dater de moins de trois mois.</p>` +
          infosDenomination(d.denomination, d.denomination_risque) +
          `<p>${TEXTE_AVERTISSEMENT_REJET_SERVEUR}</p>` +
          `<p><a href="${origine}/documents">Déposer mes pièces</a></p>` +
          `<p>CREA EXPERT</p>`,
      });
      if (!resultat.envoye) {
        ignores += 1;
        continue;
      }
      await supabaseAdmin.from("relances_pieces").insert({
        dossier_id: d.id,
        pieces_listees: attendues
          .map((a) => a.libelle)
          .join(" ; ")
          .slice(0, 2000),
      });
      await supabaseAdmin.from("events_dossier").insert({
        dossier_id: d.id,
        type_event: "relance_pieces",
        message: `Relance automatique envoyée : ${attendues.length} pièce(s) encore attendue(s).`,
      });
    }
    envoyees += 1;
  }

  return { dossiers_examines: (dossiers ?? []).length, relances_envoyees: envoyees, ignores };
}

/**
 * Rappels d'information sur la dénomination, repris mot pour mot des messages
 * affichés à l'écran. Jamais présentés comme un blocage.
 */
function infosDenomination(denomination: string | null, risque: string | null) {
  const revues = revuesDenomination(denomination, risque);
  if (revues.length === 0) return "";
  return (
    `<p>Pour information, sans conséquence sur la suite de votre dossier :</p>` +
    `<ul>${revues.map((r) => `<li>${echapper(r)}</li>`).join("")}</ul>`
  );
}

function echapper(texte: string) {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
