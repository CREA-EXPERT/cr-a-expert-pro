import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP, getRequestUrl } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const EntreePreparer = z.object({ signatureId: z.string().uuid() });
const EntreeRenvoyer = z.object({ signataireId: z.string().uuid() });
const EntreeJeton = z.object({ jeton: z.string().min(32).max(128) });
const EntreeSigner = z.object({
  jeton: z.string().min(32).max(128),
  methode: z.enum(["trace", "saisie"]),
  consentement: z.literal(true),
  nom: z.string().trim().min(2).max(120),
  tracePng: z.string().max(400_000).optional(),
});

/**
 * Prépare le document (PDF + signataires requis) et envoie à chaque signataire
 * requis, et à lui seul, son lien de signature nominatif.
 */
export const preparerEtEnvoyerSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EntreePreparer.parse(input))
  .handler(async ({ data, context }) => {
    // La RLS ne laisse voir que les documents du dossier du client ou du cabinet.
    const { data: visible } = await context.supabase
      .from("signatures_electroniques")
      .select("id")
      .eq("id", data.signatureId)
      .maybeSingle();
    if (!visible) throw new Error("Document introuvable.");

    const s = await import("./signature.server");
    const ctx = await s.chargerContexte(data.signatureId);
    if (!ctx) throw new Error("Document introuvable.");

    const blocage = s.blocageChronologie(ctx.dossier, ctx.sig.type_document);
    if (blocage) return { envoyes: 0, blocage };

    const signataires = await s.assurerSignataires(ctx.sig, ctx.dossier, ctx.associes);
    await s.preparerDocument(ctx.sig, ctx.dossier, ctx.associes);

    const origine = new URL(getRequestUrl()).origin;
    const liens = [];
    for (const sg of signataires.filter((x) => !x.horodatage && x.signataire_email)) {
      const url = await s.attribuerLien(sg, origine);
      liens.push({
        destinataire: sg.signataire_email!,
        nom: sg.signataire_nom,
        url,
        libelle: ctx.sig.libelle,
        denomination: ctx.dossier.denomination || "",
      });
    }
    const envoyes = await s.envoyerLiensSignature(liens);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("signatures_electroniques")
      .update({ statut: "a_signer", envoye_le: new Date().toISOString() })
      .eq("id", ctx.sig.id);

    return { envoyes, requis: signataires.length, blocage: null as string | null };
  });

/** Renvoie un lien nominatif à un signataire précis. */
export const renvoyerLienSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EntreeRenvoyer.parse(input))
  .handler(async ({ data, context }) => {
    const { data: visible } = await context.supabase
      .from("signatures_signataires")
      .select("id, signature_id")
      .eq("id", data.signataireId)
      .maybeSingle();
    if (!visible) throw new Error("Signataire introuvable.");

    const s = await import("./signature.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sg } = await supabaseAdmin
      .from("signatures_signataires")
      .select("*")
      .eq("id", data.signataireId)
      .maybeSingle();
    if (!sg || sg.horodatage || !sg.signataire_email) return { envoye: false };

    const ctx = await s.chargerContexte(sg.signature_id);
    if (!ctx) return { envoye: false };

    const origine = new URL(getRequestUrl()).origin;
    const url = await s.attribuerLien(sg, origine);
    const envoyes = await s.envoyerLiensSignature([
      {
        destinataire: sg.signataire_email,
        nom: sg.signataire_nom,
        url,
        libelle: ctx.sig.libelle,
        denomination: ctx.dossier.denomination || "",
      },
    ]);
    return { envoye: envoyes > 0 };
  });

/** Ouvre l'écran de signature à partir du lien nominatif. */
export const ouvrirSignature = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EntreeJeton.parse(input))
  .handler(async ({ data }) => {
    const s = await import("./signature.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = await s.sha256Hex(data.jeton);
    const { data: sg } = await supabaseAdmin
      .from("signatures_signataires")
      .select("*")
      .eq("jeton_hash", hash)
      .maybeSingle();
    if (!sg) return { valide: false as const, raison: "lien_invalide" as const };
    if (sg.jeton_expire_le && new Date(sg.jeton_expire_le) < new Date())
      return { valide: false as const, raison: "lien_expire" as const };

    const ctx = await s.chargerContexte(sg.signature_id);
    if (!ctx) return { valide: false as const, raison: "lien_invalide" as const };

    const url = await s.urlLecture(`${ctx.dossier.id}/signatures/${ctx.sig.id}-a-signer.pdf`);
    return {
      valide: true as const,
      libelle: ctx.sig.libelle,
      aide: ctx.sig.aide_client,
      denomination: ctx.dossier.denomination || "",
      signataireNom: sg.signataire_nom,
      dejaSigne: Boolean(sg.horodatage),
      blocage: s.blocageChronologie(ctx.dossier, ctx.sig.type_document),
      url,
    };
  });

/** Enregistre la signature et la preuve associée, puis recalcule le document. */
export const signerAvecLien = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EntreeSigner.parse(input))
  .handler(async ({ data }) => {
    const s = await import("./signature.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = await s.sha256Hex(data.jeton);
    const { data: sg } = await supabaseAdmin
      .from("signatures_signataires")
      .select("*")
      .eq("jeton_hash", hash)
      .maybeSingle();
    if (!sg) return { signe: false as const, raison: "lien_invalide" as const };
    if (sg.jeton_expire_le && new Date(sg.jeton_expire_le) < new Date())
      return { signe: false as const, raison: "lien_expire" as const };
    if (sg.horodatage) return { signe: true as const, raison: null };

    const ctx = await s.chargerContexte(sg.signature_id);
    if (!ctx) return { signe: false as const, raison: "lien_invalide" as const };

    const blocage = s.blocageChronologie(ctx.dossier, ctx.sig.type_document);
    if (blocage) return { signe: false as const, raison: "chronologie" as const, blocage };

    const chemin = `${ctx.dossier.id}/signatures/${ctx.sig.id}-a-signer.pdf`;
    let octets = await s.telechargerOctets(chemin);
    if (!octets) {
      await s.preparerDocument(ctx.sig, ctx.dossier, ctx.associes);
      octets = await s.telechargerOctets(chemin);
    }
    if (!octets) return { signe: false as const, raison: "document_indisponible" as const };
    const empreinte = await s.sha256Hex(octets);

    if (data.methode === "trace" && data.tracePng) {
      await s.enregistrerTrace(ctx.dossier.id, sg.id, data.tracePng.replace(/^data:image\/png;base64,/, ""));
    }

    await supabaseAdmin
      .from("signatures_signataires")
      .update({
        methode: data.methode,
        signataire_nom: data.nom,
        consentement: true,
        horodatage: new Date().toISOString(),
        adresse_ip: getRequestIP({ xForwardedFor: true }) ?? null,
        user_agent: getRequestHeader("user-agent") ?? null,
        hash_document: empreinte,
        jeton_hash: null,
      })
      .eq("id", sg.id);

    await s.finaliserSiComplet(sg.signature_id);
    return { signe: true as const, raison: null };
  });
