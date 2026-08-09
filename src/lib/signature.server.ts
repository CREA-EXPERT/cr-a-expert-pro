/**
 * Moteur de signature électronique simple, côté serveur uniquement.
 *
 * Le mode "interne" (provider = "interne") produit lui-même les liens de
 * signature. Un futur mode "yousign" utilisera Yousign en Delivery Mode = none
 * et se contentera de fournir les liens : l'envoi des emails passe dans les
 * deux cas par `envoyerLiensSignature`, seule porte de sortie.
 */
import { genererPdf, apposerPageDeSignature, type PreuveSignataire } from "./pdf";
import { verifierDates, type Associe, type Dossier } from "./documents";
import { PDF_POUR_SIGNATURE, signatairesRequis, statutDepuisSignataires } from "./signatures";
import { envoyerEmail } from "./email.server";
import type { Tables } from "@/integrations/supabase/types";

export const BUCKET_SIGNATURES = "documents";
export const EXPEDITEUR_SIGNATURE = "CREA EXPERT <signature@crea-expert.fr>";
/** Durée de validité d'un lien de signature nominatif. */
export const VALIDITE_LIEN_HEURES = 72;

type SignatureRow = Tables<"signatures_electroniques">;
type SignataireRow = Tables<"signatures_signataires">;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export function octetsVersHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(donnees: Uint8Array | string) {
  const source = typeof donnees === "string" ? new TextEncoder().encode(donnees) : donnees;
  const buf = await crypto.subtle.digest("SHA-256", source as unknown as BufferSource);
  return octetsVersHex(buf);
}

export function creerJeton() {
  const octets = new Uint8Array(32);
  crypto.getRandomValues(octets);
  return Array.from(octets)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function lienDeSignature(origine: string, jeton: string) {
  return `${origine.replace(/\/$/, "")}/signer/${jeton}`;
}

function cheminBase(dossierId: string, signatureId: string) {
  return `${dossierId}/signatures/${signatureId}-a-signer.pdf`;
}
function cheminSigne(dossierId: string, signatureId: string) {
  return `${dossierId}/signatures/${signatureId}-signe.pdf`;
}
function cheminTrace(dossierId: string, signataireId: string) {
  return `${dossierId}/signatures/traces/${signataireId}.png`;
}

/** Chronologie : dépôt des fonds → signature des statuts → annonce légale. */
export function blocageChronologie(dossier: Dossier, typeDocument: string): string | null {
  if (typeDocument !== "sig_statuts") return null;
  const provisoire = {
    ...dossier,
    date_signature: dossier.date_signature ?? new Date().toISOString().slice(0, 10),
  } as Dossier;
  const erreurs = verifierDates(provisoire).filter(
    (e) => !e.includes("n'est pas renseignée"),
  );
  return erreurs[0] ?? null;
}

export async function chargerContexte(signatureId: string) {
  const sb = await admin();
  const { data: sig } = await sb
    .from("signatures_electroniques")
    .select("*")
    .eq("id", signatureId)
    .maybeSingle();
  if (!sig) return null;
  const { data: dossier } = await sb
    .from("dossiers")
    .select("*")
    .eq("id", sig.dossier_id)
    .maybeSingle();
  if (!dossier) return null;
  const { data: associes } = await sb.from("associes").select("*").eq("dossier_id", dossier.id);
  return {
    sig: sig as SignatureRow,
    dossier: dossier as Dossier,
    associes: (associes ?? []) as Associe[],
  };
}

/** Crée (sans doublon) les lignes de preuve correspondant aux signataires requis. */
export async function assurerSignataires(
  sig: SignatureRow,
  dossier: Dossier,
  associes: Associe[],
): Promise<SignataireRow[]> {
  const sb = await admin();
  const requis = signatairesRequis(sig.type_document, dossier, associes);
  const { data: existants } = await sb
    .from("signatures_signataires")
    .select("*")
    .eq("signature_id", sig.id);
  const deja = new Set((existants ?? []).map((s) => s.associe_id ?? ""));
  const aCreer = requis
    .filter((r) => !deja.has(r.associeId ?? ""))
    .map((r) => ({
      signature_id: sig.id,
      associe_id: r.associeId,
      signataire_nom: r.nom,
      signataire_email: r.email,
    }));
  if (aCreer.length > 0) await sb.from("signatures_signataires").insert(aCreer);
  const { data: tous } = await sb
    .from("signatures_signataires")
    .select("*")
    .eq("signature_id", sig.id);
  return (tous ?? []) as SignataireRow[];
}

/** Génère le PDF à signer et le dépose dans le bucket privé du dossier. */
export async function preparerDocument(sig: SignatureRow, dossier: Dossier, associes: Associe[]) {
  const sb = await admin();
  const type = PDF_POUR_SIGNATURE[sig.type_document] ?? "document";
  const octets = await genererPdf(type, dossier, associes, null);
  const chemin = cheminBase(dossier.id, sig.id);
  await sb.storage
    .from(BUCKET_SIGNATURES)
    .upload(chemin, octets as unknown as Blob, { contentType: "application/pdf", upsert: true });
  const empreinte = await sha256Hex(octets);
  await sb
    .from("signatures_electroniques")
    .update({ provider: sig.provider ?? "interne", hash_document: empreinte })
    .eq("id", sig.id);
  return { chemin, empreinte };
}

export type LienAEnvoyer = {
  destinataire: string;
  nom: string;
  url: string;
  libelle: string;
  denomination: string;
  dossierId: string;
  signatureId: string;
  signataireId: string;
};

/** Valeurs de repli si le réglage administrable n'est pas encore renseigné. */
export const MAX_TENTATIVES_ENVOI = 3;
export const INTERVALLE_RELANCE_DEFAUT = 6;

export type ReglagesRelance = {
  maxTentatives: number;
  intervalleHeures: number;
  relanceAutoActive: boolean;
};

/** Réglages de relance pilotés par l'administrateur. */
export async function chargerReglages(): Promise<ReglagesRelance> {
  const sb = await admin();
  const { data } = await sb
    .from("params_signature")
    .select("max_tentatives, intervalle_relance_heures, relance_auto_active")
    .limit(1)
    .maybeSingle();
  return {
    maxTentatives: data?.max_tentatives ?? MAX_TENTATIVES_ENVOI,
    intervalleHeures: data?.intervalle_relance_heures ?? INTERVALLE_RELANCE_DEFAUT,
    relanceAutoActive: data?.relance_auto_active ?? true,
  };
}


/** Ne conserve qu'une forme masquée de l'adresse dans le journal (minimisation RGPD). */
export function masquerEmail(email: string) {
  const [locale = "", domaine = ""] = email.split("@");
  const debut = locale.slice(0, 1) || "•";
  return `${debut}${"•".repeat(Math.max(locale.length - 1, 1))}@${domaine}`;
}

/** Cause générique, sans détail technique ni donnée personnelle. */
function causeGenerique(r: { envoye: false; raison: string; detail?: string }): string {
  if (r.raison === "non_configure") return "service_indisponible";
  const d = (r.detail ?? "").toLowerCase();
  if (d.includes("invalid") && d.includes("email")) return "adresse_invalide";
  if (d.includes("rate") || d.includes("429")) return "trop_de_demandes";
  return "envoi_refuse";
}




/** Envoi des convocations : commun au mode interne et à un futur mode Yousign. */
export async function envoyerLiensSignature(
  liens: LienAEnvoyer[],
  declencheur: "manuel" | "relance_manuelle" | "relance_auto" = "manuel",
) {
  const sb = await admin();
  let envoyes = 0;
  const echecs: { signataireId: string; cause: string }[] = [];

  for (const lien of liens) {
    const html = `
      <p>Bonjour ${lien.nom},</p>
      <p>Le document « ${lien.libelle} » de la société ${lien.denomination} attend votre signature.</p>
      <p><a href="${lien.url}">Signer le document</a></p>
      <p>Ce lien vous est personnel et reste valable ${VALIDITE_LIEN_HEURES} heures. Ne le transmettez à personne.</p>
      <p>Signature électronique simple : en signant, vous vous engagez ; une preuve (horodatage et empreinte du document) est conservée.</p>
      <p>CREA EXPERT</p>`;
    const r = await envoyerEmail({
      destinataire: lien.destinataire,
      sujet: `Signature à effectuer — ${lien.libelle}`,
      html,
      expediteur: EXPEDITEUR_SIGNATURE,
    });

    const { data: ligne } = await sb
      .from("signatures_signataires")
      .select("tentatives_envoi")
      .eq("id", lien.signataireId)
      .maybeSingle();
    const tentative = (ligne?.tentatives_envoi ?? 0) + 1;
    const cause = r.envoye ? null : causeGenerique(r as { envoye: false; raison: string; detail?: string });

    await sb
      .from("signatures_signataires")
      .update({
        tentatives_envoi: tentative,
        dernier_essai_le: new Date().toISOString(),
        dernier_resultat: r.envoye ? "succes" : "echec",
        derniere_cause: cause,
      })
      .eq("id", lien.signataireId);

    await sb.from("journal_emails_signature").insert({
      dossier_id: lien.dossierId,
      signature_id: lien.signatureId,
      signataire_id: lien.signataireId,
      destinataire_masque: masquerEmail(lien.destinataire),
      tentative,
      declencheur,
      resultat: r.envoye ? "succes" : "echec",
      cause,
    });

    if (r.envoye) envoyes += 1;
    else echecs.push({ signataireId: lien.signataireId, cause: cause! });
  }
  return { envoyes, echecs };
}

/**
 * Relance les convocations non délivrées : uniquement les signataires en échec,
 * non signés, et sous le plafond de tentatives.
 */
export async function relancerEnvoisEnEchec(
  origine: string,
  declencheur: "relance_manuelle" | "relance_auto",
  filtre?: { signatureId?: string; signataireId?: string },
) {
  const sb = await admin();
  let q = sb
    .from("signatures_signataires")
    .select("*")
    .is("horodatage", null)
    .eq("dernier_resultat", "echec")
    .lt("tentatives_envoi", MAX_TENTATIVES_ENVOI);
  if (filtre?.signatureId) q = q.eq("signature_id", filtre.signatureId);
  if (filtre?.signataireId) q = q.eq("id", filtre.signataireId);
  const { data } = await q;
  const lignes = ((data ?? []) as SignataireRow[]).filter((l) => l.signataire_email);

  let envoyes = 0;
  let echoues = 0;
  for (const sg of lignes) {
    const ctx = await chargerContexte(sg.signature_id);
    if (!ctx) continue;
    const url = await attribuerLien(sg, origine);
    const r = await envoyerLiensSignature(
      [
        {
          destinataire: sg.signataire_email!,
          nom: sg.signataire_nom,
          url,
          libelle: ctx.sig.libelle,
          denomination: ctx.dossier.denomination || "",
          dossierId: ctx.dossier.id,
          signatureId: ctx.sig.id,
          signataireId: sg.id,
        },
      ],
      declencheur,
    );
    envoyes += r.envoyes;
    echoues += r.echecs.length;
  }
  return { traites: lignes.length, envoyes, echoues, plafond: MAX_TENTATIVES_ENVOI };
}


/** Attribue un lien nominatif à un signataire et renvoie l'URL en clair. */
export async function attribuerLien(signataire: SignataireRow, origine: string) {
  const sb = await admin();
  const jeton = creerJeton();
  const hash = await sha256Hex(jeton);
  const expire = new Date(Date.now() + VALIDITE_LIEN_HEURES * 3600 * 1000).toISOString();
  await sb
    .from("signatures_signataires")
    .update({ jeton_hash: hash, jeton_expire_le: expire, envoye_le: new Date().toISOString() })
    .eq("id", signataire.id);
  return lienDeSignature(origine, jeton);
}

export async function urlLecture(chemin: string, secondes = 900) {
  const sb = await admin();
  const { data } = await sb.storage.from(BUCKET_SIGNATURES).createSignedUrl(chemin, secondes);
  return data?.signedUrl ?? null;
}

export async function telechargerOctets(chemin: string): Promise<Uint8Array | null> {
  const sb = await admin();
  const { data } = await sb.storage.from(BUCKET_SIGNATURES).download(chemin);
  if (!data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

export async function enregistrerTrace(dossierId: string, signataireId: string, pngBase64: string) {
  const sb = await admin();
  const binaire = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));
  await sb.storage
    .from(BUCKET_SIGNATURES)
    .upload(cheminTrace(dossierId, signataireId), binaire as unknown as Blob, {
      contentType: "image/png",
      upsert: true,
    });
}

/**
 * Recalcule le statut du document ; lorsque tous les signataires requis ont
 * signé, estampille le PDF final et le range dans le circuit documentaire.
 */
export async function finaliserSiComplet(signatureId: string) {
  const sb = await admin();
  const ctx = await chargerContexte(signatureId);
  if (!ctx) return;
  const { sig, dossier } = ctx;
  const { data: signataires } = await sb
    .from("signatures_signataires")
    .select("*")
    .eq("signature_id", sig.id)
    .order("created_at");
  const lignes = (signataires ?? []) as SignataireRow[];
  const statut = statutDepuisSignataires(lignes);

  if (statut !== "signe") {
    await sb.from("signatures_electroniques").update({ statut }).eq("id", sig.id);
    return;
  }

  const base = await telechargerOctets(cheminBase(dossier.id, sig.id));
  let cheminFinal: string | null = null;
  let empreinteFinale = sig.hash_document ?? null;

  if (base) {
    const preuves: PreuveSignataire[] = [];
    for (const l of lignes) {
      let trace: Uint8Array | null = null;
      if (l.methode === "trace") trace = await telechargerOctets(cheminTrace(dossier.id, l.id));
      preuves.push({
        nom: l.signataire_nom,
        methode: (l.methode as "trace" | "saisie") ?? "saisie",
        horodatage: l.horodatage ?? new Date().toISOString(),
        trace,
      });
    }
    const empreinteBase = await sha256Hex(base);
    const finalPdf = await apposerPageDeSignature(base, {
      libelle: sig.libelle,
      denomination: dossier.denomination || "",
      signataires: preuves,
      empreinte: empreinteBase,
    });
    cheminFinal = cheminSigne(dossier.id, sig.id);
    await sb.storage
      .from(BUCKET_SIGNATURES)
      .upload(cheminFinal, finalPdf as unknown as Blob, {
        contentType: "application/pdf",
        upsert: true,
      });
    empreinteFinale = await sha256Hex(finalPdf);
  }

  await sb
    .from("signatures_electroniques")
    .update({
      statut: "signe",
      signe_le: new Date().toISOString(),
      fichier_signe: cheminFinal,
      hash_document: empreinteFinale,
    })
    .eq("id", sig.id);

  if (sig.type_document === "sig_statuts" && !dossier.date_signature) {
    await sb
      .from("dossiers")
      .update({ date_signature: new Date().toISOString().slice(0, 10) })
      .eq("id", dossier.id);
  }

  await sb.from("events_dossier").insert({
    dossier_id: dossier.id,
    type_event: "signature",
    message: `Document signé électroniquement : ${sig.libelle}.`,
  });
}
