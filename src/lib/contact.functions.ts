import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { declencheEnvoi, objetEmailContact, type CategorieContact } from "./contact";
import { referenceDemande } from "./contact";
import { estEmailTest } from "./test-mode";

const Entree = z.object({
  categorie: z.enum(["amelioration", "bug", "dossier", "paiement", "autre"]),
  message: z.string().trim().min(10).max(2000),
  email: z.string().trim().email().max(255),
  dossier_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  piege: z.string().max(200).optional(),
});

function echapper(texte: string) {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ipAppelant() {
  return getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() || "inconnu";
}

/**
 * Transmet un message de contact au cabinet, uniquement pour les catégories
 * à valeur (amélioration, bug, dossier, paiement). La catégorie « autre »
 * ne déclenche jamais d'envoi : elle oriente vers la consultation payante.
 */
export const envoyerMessageContact = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Entree.parse(input))
  .handler(async ({ data }) => {
    if (data.piege) return { ok: true as const, envoye: false };
    if (!declencheEnvoi(data.categorie as CategorieContact)) {
      return { ok: false as const, raison: "categorie_sans_envoi" as const };
    }

    const { verifierLimite } = await import("./antiabus.server");
    const autorise = await verifierLimite("contact", ipAppelant());
    if (!autorise) return { ok: false as const, raison: "trop_de_demandes" as const };

    const { EMAIL_CABINET } = await import("./config");
    const { envoyerEmail } = await import("./email.server");

    const reference = referenceDemande();
    const objetBase =
      objetEmailContact(data.categorie as CategorieContact, data.dossier_id) ?? "[CONTACT]";
    const objet = `${objetBase} — ${reference}`;
    const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.7">
  <p><strong>Numéro de demande :</strong> ${reference}</p>
  <p><strong>Catégorie :</strong> ${echapper(data.categorie)}</p>
  <p><strong>Expéditeur :</strong> ${echapper(data.email)}</p>
  ${data.dossier_id ? `<p><strong>Dossier :</strong> ${echapper(data.dossier_id)}</p>` : ""}
  ${data.user_id ? `<p><strong>Compte :</strong> ${echapper(data.user_id)}</p>` : ""}
  <hr />
  <p>${echapper(data.message).replace(/\n/g, "<br />")}</p>
</div>`;

    const resultat = await envoyerEmail({ destinataire: EMAIL_CONTACT, sujet: objet, html });

    const { supabaseAdmin: sbJournal } = await import("@/integrations/supabase/client.server");
    await sbJournal.from("demandes_contact").insert({
      reference,
      categorie: data.categorie,
      email: data.email,
      message: data.message,
      objet,
      dossier_id: data.dossier_id ?? null,
      user_id: data.user_id ?? null,
      envoye: resultat.envoye,
      test: estEmailTest(data.email),
    });

    // Journalisation : sur le dossier lorsqu'il est connu, sinon en trace serveur.
    if (data.dossier_id) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("events_dossier").insert({
          dossier_id: data.dossier_id,
          type_event: "contact",
          message: `Message de contact (${data.categorie}) transmis au cabinet.`,
        });
      } catch {
        /* le journal ne bloque jamais l'envoi */
      }
    }
    console.info(
      `[contact] ${data.categorie} · ${new Date().toISOString()} · user=${data.user_id ?? "anonyme"} · envoye=${resultat.envoye}`,
    );

    return {
      ok: true as const,
      envoye: resultat.envoye,
      reference,
      recapitulatif: {
        reference,
        categorie: data.categorie,
        email: data.email,
        dossier_id: data.dossier_id ?? null,
        message: data.message,
        horodatage: new Date().toISOString(),
      },
    };
  });
