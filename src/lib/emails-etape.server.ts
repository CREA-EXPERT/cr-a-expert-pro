/**
 * Emails d'étape du dossier : ouverture du dossier et transmission au cabinet.
 * Serveur uniquement. Les règles du mode test (préfixe et destinataire unique)
 * sont appliquées par `envoyerEmail`.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { envoyerEmail } from "./email.server";
import { EMAIL_CONTACT } from "./contact";
import { FORMES } from "./domain";

function echapper(texte: string) {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function origine() {
  return process.env["APP_URL"] ?? "https://crea-expert.fr";
}

async function contexte(dossierId: string) {
  const { data: dossier } = await supabaseAdmin
    .from("dossiers")
    .select("id, user_id, denomination, forme_juridique, statut")
    .eq("id", dossierId)
    .maybeSingle();
  if (!dossier) return null;
  const { data: profil } = await supabaseAdmin
    .from("profiles")
    .select("email, prenom")
    .eq("id", dossier.user_id)
    .maybeSingle();
  if (!profil?.email) return null;
  return { dossier, profil };
}

/** « Votre dossier de création est ouvert » — envoyé à la fin du wizard. */
export async function emailDossierOuvert(dossierId: string) {
  const ctx = await contexte(dossierId);
  if (!ctx) return { envoye: false };
  const { dossier, profil } = ctx;
  const forme =
    FORMES.find((f) => f.value === dossier.forme_juridique)?.label ?? dossier.forme_juridique;

  const html =
    `<p>Bonjour${profil.prenom ? ` ${echapper(profil.prenom)}` : ""},</p>` +
    `<p>Votre dossier de création est ouvert.</p>` +
    `<ul>` +
    `<li><strong>Dénomination :</strong> ${echapper(dossier.denomination || "à préciser")}</li>` +
    `<li><strong>Forme juridique :</strong> ${echapper(forme)}</li>` +
    `</ul>` +
    `<p>Les prochaines étapes :</p>` +
    `<ol>` +
    `<li>Déposer les justificatifs demandés dans « Mes documents ».</li>` +
    `<li>Signer électroniquement les documents préparés.</li>` +
    `<li>Transmettre le dossier au cabinet depuis l'écran de vérification finale.</li>` +
    `</ol>` +
    `<p><a href="${origine()}/tableau-de-bord">Suivre mon dossier</a></p>` +
    `<p>CREA EXPERT</p>`;

  const r = await envoyerEmail({
    destinataire: profil.email,
    sujet: "Votre dossier de création est ouvert",
    html,
    dossierId,
  });
  return { envoye: r.envoye };
}

/** « Votre dossier est complet et transmis au cabinet ». */
export async function emailDossierTransmis(dossierId: string) {
  const ctx = await contexte(dossierId);
  if (!ctx) return { envoye: false };
  const { dossier, profil } = ctx;

  const { data: docs } = await supabaseAdmin
    .from("documents")
    .select("libelle, statut_document, origine")
    .eq("dossier_id", dossierId)
    .order("libelle");

  const liste = (docs ?? [])
    .map((d) => `<li>${echapper(d.libelle)} — ${echapper(d.statut_document)}</li>`)
    .join("");

  const html =
    `<p>Bonjour${profil.prenom ? ` ${echapper(profil.prenom)}` : ""},</p>` +
    `<p>Votre dossier${dossier.denomination ? ` « ${echapper(dossier.denomination)} »` : ""} est complet et transmis au cabinet d'expertise comptable.</p>` +
    `<p>Documents du dossier :</p>` +
    `<ul>${liste || "<li>Aucun document enregistré.</li>"}</ul>` +
    `<p>Le cabinet revient vers vous après examen. Pour toute question : ${EMAIL_CONTACT}.</p>` +
    `<p><a href="${origine()}/tableau-de-bord">Suivre mon dossier</a></p>` +
    `<p>CREA EXPERT</p>`;

  const r = await envoyerEmail({
    destinataire: profil.email,
    sujet: "Votre dossier est complet et transmis au cabinet",
    html,
    dossierId,
  });
  return { envoye: r.envoye };
}
