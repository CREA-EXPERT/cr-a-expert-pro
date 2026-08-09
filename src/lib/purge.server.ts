/**
 * Moteur de conservation : archivage KYC puis purge des données arrivées à échéance.
 * Exécuté côté serveur uniquement, avec la clé de service.
 *
 * Propriétés :
 * - idempotent (chaque étape vérifie l'état avant d'agir) ;
 * - par lots (LOT) ;
 * - tolérant aux erreurs unitaires (log technique, poursuite) ;
 * - aucune donnée personnelle dans les journaux.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  BUCKET_DOCUMENTS,
  BUCKET_KYC,
  CONSERVATION,
  STATUTS_ARCHIVAGE_KYC,
  STATUTS_TERMINAUX,
  TYPES_PIECE_IDENTITE,
  TYPES_VIGILANCE,
  delaiPurgePieceIdentite,
  echeanceKyc,
} from "@/lib/conservation";

const LOT = 200;

export type LignePurge = {
  type_donnee: string;
  nombre_elements_supprimes: number;
  details_techniques: Record<string, unknown>;
};

type Contexte = {
  dryRun: boolean;
  maintenant: Date;
  erreurs: string[];
};

function ilYA(jours: number, maintenant: Date) {
  return new Date(maintenant.getTime() - jours * 86_400_000).toISOString();
}

/** Enregistre une erreur technique, sans aucune donnée personnelle. */
function noterErreur(ctx: Contexte, etape: string, e: unknown) {
  const code = e instanceof Error ? e.name : "inconnu";
  ctx.erreurs.push(`${etape}:${code}`);
}

/** 1. Archivage KYC des dossiers terminaux pris en charge par le cabinet. */
async function archiverKyc(ctx: Contexte): Promise<LignePurge> {
  let archives = 0;
  let dossiersTraites = 0;
  let fichiersCopies = 0;

  const { data: dossiers } = await supabaseAdmin
    .from("dossiers")
    .select("id, statut, cabinet_engage, date_statut, date_fin_relation, date_archivage_kyc")
    .eq("cabinet_engage", true)
    .is("date_archivage_kyc", null)
    .in("statut", STATUTS_ARCHIVAGE_KYC as string[])
    .limit(LOT);

  for (const d of dossiers ?? []) {
    // Un dossier abandonné n'est archivé qu'au terme du délai d'abandon.
    if (d.statut === "abandonne") {
      const ecoule =
        (ctx.maintenant.getTime() - new Date(d.date_statut ?? ctx.maintenant).getTime()) /
        86_400_000;
      if (ecoule < CONSERVATION.DOSSIER_ABANDONNE_JOURS) continue;
    }

    try {
      const finRelation = d.date_fin_relation ?? d.date_statut ?? ctx.maintenant.toISOString();

      const { data: pieces } = await supabaseAdmin
        .from("documents")
        .select("id, associe_id, type_document, libelle, fichier_url, valide_le, atteste_le, statut_document")
        .eq("dossier_id", d.id)
        .in("type_document", [...TYPES_PIECE_IDENTITE, ...TYPES_VIGILANCE]);

      const beneficiaires = new Set(
        (
          (
            await supabaseAdmin
              .from("associes")
              .select("id, nb_titres, est_associe")
              .eq("dossier_id", d.id)
          ).data ?? []
        )
          .filter((a) => a.est_associe)
          .map((a) => a.id),
      );

      for (const p of pieces ?? []) {
        const categorie = TYPES_VIGILANCE.includes(p.type_document)
          ? "vigilance"
          : p.associe_id && beneficiaires.has(p.associe_id)
            ? "piece_identite_be"
            : "piece_identite_client";

        // Idempotence : ne rien refaire si déjà archivé.
        const { data: deja } = await supabaseAdmin
          .from("dossier_kyc")
          .select("id")
          .eq("dossier_id", d.id)
          .eq("document_id", p.id)
          .maybeSingle();
        if (deja) continue;

        let chemin: string | null = null;
        if (p.fichier_url && !ctx.dryRun) {
          const { data: blob } = await supabaseAdmin.storage
            .from(BUCKET_DOCUMENTS)
            .download(p.fichier_url);
          if (blob) {
            chemin = `${d.id}/${p.id}-${p.type_document}`;
            const { error } = await supabaseAdmin.storage
              .from(BUCKET_KYC)
              .upload(chemin, blob, { upsert: true });
            if (error) throw new Error("copie_archive");
            fichiersCopies += 1;
          }
        } else if (p.fichier_url) {
          fichiersCopies += 1;
        }

        if (!ctx.dryRun) {
          await supabaseAdmin.from("dossier_kyc").insert({
            dossier_id: d.id,
            document_id: p.id,
            associe_id: p.associe_id,
            categorie,
            type_document: p.type_document,
            libelle: p.libelle,
            chemin_archive: chemin,
            metadonnees: {
              statut_document: p.statut_document,
              atteste_le: p.atteste_le,
              valide_le: p.valide_le,
              verification: p.valide_le ? "validee_cabinet" : "attestee_client",
            },
            date_fin_relation: finRelation,
            conserver_jusqu_au: echeanceKyc(finRelation),
          });
        }
        archives += 1;
      }

      if (!ctx.dryRun) {
        await supabaseAdmin
          .from("dossiers")
          .update({
            date_fin_relation: finRelation,
            date_archivage_kyc: ctx.maintenant.toISOString(),
          })
          .eq("id", d.id);
      }
      dossiersTraites += 1;
    } catch (e) {
      noterErreur(ctx, "archivage_kyc", e);
    }
  }

  return {
    type_donnee: "archivage_kyc",
    nombre_elements_supprimes: archives,
    details_techniques: { dossiers_traites: dossiersTraites, fichiers_copies: fichiersCopies },
  };
}

/** Trace non identifiante écrite avant tout retrait d'une pièce d'identité. */
async function tracer(
  ctx: Contexte,
  doc: { dossier_id: string; type_document: string; valide_le: string | null; atteste_le: string | null },
) {
  if (ctx.dryRun) return;
  await supabaseAdmin.from("traces_verification_identite").insert({
    dossier_id: doc.dossier_id,
    piece_verifiee: true,
    type_piece: doc.type_document,
    date_verification: doc.valide_le ?? doc.atteste_le,
    date_suppression: ctx.maintenant.toISOString(),
  });
}

async function supprimerDocuments(
  ctx: Contexte,
  docs: {
    id: string;
    dossier_id: string;
    type_document: string;
    fichier_url: string | null;
    valide_le: string | null;
    atteste_le: string | null;
  }[],
) {
  let supprimes = 0;
  for (const doc of docs) {
    try {
      await tracer(ctx, doc);
      if (!ctx.dryRun) {
        if (doc.fichier_url) {
          await supabaseAdmin.storage.from(BUCKET_DOCUMENTS).remove([doc.fichier_url]);
        }
        await supabaseAdmin.from("documents").delete().eq("id", doc.id);
      }
      supprimes += 1;
    } catch (e) {
      noterErreur(ctx, "suppression_piece", e);
    }
  }
  return supprimes;
}

/** 2. Retrait de la copie opérationnelle des pièces d'identité déjà archivées en KYC. */
async function retirerCopieOperationnelle(ctx: Contexte): Promise<LignePurge> {
  const { data: dossiers } = await supabaseAdmin
    .from("dossiers")
    .select("id")
    .eq("cabinet_engage", true)
    .not("date_archivage_kyc", "is", null)
    .limit(LOT);

  const ids = (dossiers ?? []).map((d) => d.id);
  if (ids.length === 0) {
    return { type_donnee: "retrait_copie_operationnelle", nombre_elements_supprimes: 0, details_techniques: { dossiers: 0 } };
  }

  const { data: docs } = await supabaseAdmin
    .from("documents")
    .select("id, dossier_id, type_document, fichier_url, valide_le, atteste_le")
    .in("dossier_id", ids)
    .in("type_document", TYPES_PIECE_IDENTITE as string[])
    .limit(LOT);

  const supprimes = await supprimerDocuments(ctx, docs ?? []);
  return {
    type_donnee: "retrait_copie_operationnelle",
    nombre_elements_supprimes: supprimes,
    details_techniques: { dossiers: ids.length },
  };
}

/** 3. Pièces d'identité des dossiers terminaux SANS cabinet engagé (minimisation RGPD). */
async function purgerPiecesSansKyc(ctx: Contexte): Promise<LignePurge> {
  const { data: dossiers } = await supabaseAdmin
    .from("dossiers")
    .select("id, statut, date_statut")
    .eq("cabinet_engage", false)
    .in("statut", STATUTS_TERMINAUX as string[])
    .limit(LOT);

  const eligibles = (dossiers ?? []).filter((d) => {
    const ecoule =
      (ctx.maintenant.getTime() - new Date(d.date_statut ?? ctx.maintenant).getTime()) / 86_400_000;
    return ecoule >= delaiPurgePieceIdentite(d.statut ?? "");
  });

  if (eligibles.length === 0) {
    return { type_donnee: "piece_identite_sans_kyc", nombre_elements_supprimes: 0, details_techniques: { dossiers: 0 } };
  }

  const { data: docs } = await supabaseAdmin
    .from("documents")
    .select("id, dossier_id, type_document, fichier_url, valide_le, atteste_le")
    .in(
      "dossier_id",
      eligibles.map((d) => d.id),
    )
    .in("type_document", TYPES_PIECE_IDENTITE as string[])
    .limit(LOT);

  const supprimes = await supprimerDocuments(ctx, docs ?? []);
  return {
    type_donnee: "piece_identite_sans_kyc",
    nombre_elements_supprimes: supprimes,
    details_techniques: { dossiers: eligibles.length },
  };
}

/** 4. Purge des archives KYC dont les 5 ans depuis la fin de relation sont écoulés. */
async function purgerArchivesKyc(ctx: Contexte): Promise<LignePurge> {
  const aujourdhui = ctx.maintenant.toISOString().slice(0, 10);
  const { data: archives } = await supabaseAdmin
    .from("dossier_kyc")
    .select("id, chemin_archive, conserver_jusqu_au")
    .not("conserver_jusqu_au", "is", null)
    .lt("conserver_jusqu_au", aujourdhui)
    .limit(LOT);

  let supprimes = 0;
  for (const a of archives ?? []) {
    try {
      if (!ctx.dryRun) {
        if (a.chemin_archive) await supabaseAdmin.storage.from(BUCKET_KYC).remove([a.chemin_archive]);
        await supabaseAdmin.from("dossier_kyc").delete().eq("id", a.id);
      }
      supprimes += 1;
    } catch (e) {
      noterErreur(ctx, "purge_archive_kyc", e);
    }
  }
  return {
    type_donnee: "archive_kyc_echue",
    nombre_elements_supprimes: supprimes,
    details_techniques: { seuil_annees: CONSERVATION.KYC_ANNEES },
  };
}

/** 5. Demandes de rappel non converties au-delà de 3 ans. */
async function purgerDemandesContact(ctx: Contexte): Promise<LignePurge> {
  const seuil = ilYA(CONSERVATION.DEMANDE_CONTACT_JOURS, ctx.maintenant);
  const { data: rappels } = await supabaseAdmin
    .from("callbacks")
    .select("id")
    .lt("created_at", seuil)
    .limit(LOT);

  const ids = (rappels ?? []).map((r) => r.id);
  if (ids.length > 0 && !ctx.dryRun) {
    try {
      await supabaseAdmin.from("callbacks").delete().in("id", ids);
    } catch (e) {
      noterErreur(ctx, "purge_contacts", e);
    }
  }

  const { data: simulations } = await supabaseAdmin
    .from("simulations")
    .select("id")
    .lt("created_at", seuil)
    .limit(LOT);
  const idsSim = (simulations ?? []).map((s) => s.id);
  if (idsSim.length > 0 && !ctx.dryRun) {
    try {
      await supabaseAdmin.from("simulations").delete().in("id", idsSim);
    } catch (e) {
      noterErreur(ctx, "purge_simulations", e);
    }
  }

  return {
    type_donnee: "demandes_contact",
    nombre_elements_supprimes: ids.length + idsSim.length,
    details_techniques: { rappels: ids.length, simulations: idsSim.length, seuil_jours: CONSERVATION.DEMANDE_CONTACT_JOURS },
  };
}

/** 6. Anonymisation des comptes sans aucune connexion depuis 3 ans. */
async function anonymiserComptesInactifs(ctx: Contexte): Promise<LignePurge> {
  const seuil = ctx.maintenant.getTime() - CONSERVATION.COMPTE_INACTIF_JOURS * 86_400_000;
  let anonymises = 0;

  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: LOT });
    for (const u of data?.users ?? []) {
      const derniere = u.last_sign_in_at ?? u.created_at;
      if (!derniere || new Date(derniere).getTime() > seuil) continue;

      const { count } = await supabaseAdmin
        .from("dossiers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", u.id)
        .eq("cabinet_engage", true);
      // Un dossier suivi par le cabinet reste soumis à la vigilance : pas d'anonymisation.
      if ((count ?? 0) > 0) continue;

      if (!ctx.dryRun) {
        await supabaseAdmin
          .from("profiles")
          .update({ prenom: "Compte", nom: "anonymisé", email: `anonymise+${u.id}@invalid`, telephone: null, consent_marketing: false })
          .eq("id", u.id);
      }
      anonymises += 1;
    }
  } catch (e) {
    noterErreur(ctx, "anonymisation_comptes", e);
  }

  return {
    type_donnee: "comptes_inactifs",
    nombre_elements_supprimes: anonymises,
    details_techniques: { seuil_jours: CONSERVATION.COMPTE_INACTIF_JOURS },
  };
}

/**
 * Exécution complète. La facturation (`archives_facturation`), les statuts et les
 * preuves de signature sont explicitement hors périmètre : aucune requête ne les vise.
 */
export async function executerPurge(options: { dryRun?: boolean; declencheur: string }) {
  const ctx: Contexte = { dryRun: options.dryRun ?? false, maintenant: new Date(), erreurs: [] };
  const executionId = crypto.randomUUID();

  const lignes: LignePurge[] = [];
  for (const etape of [
    archiverKyc,
    retirerCopieOperationnelle,
    purgerPiecesSansKyc,
    purgerArchivesKyc,
    purgerDemandesContact,
    anonymiserComptesInactifs,
  ]) {
    try {
      lignes.push(await ctx_run(etape, ctx));
    } catch (e) {
      noterErreur(ctx, etape.name, e);
    }
  }

  const total = lignes.reduce((s, l) => s + l.nombre_elements_supprimes, 0);
  const resume: LignePurge = {
    type_donnee: "resume_execution",
    nombre_elements_supprimes: total,
    details_techniques: {
      declencheur: options.declencheur,
      erreurs: ctx.erreurs.length,
      codes_erreur: ctx.erreurs.slice(0, 20),
      facturation: "hors_perimetre",
    },
  };

  try {
    await supabaseAdmin.from("journal_purge").insert(
      [...lignes, resume].map((l) => ({
        execution_id: executionId,
        dry_run: ctx.dryRun,
        type_donnee: l.type_donnee,
        nombre_elements_supprimes: l.nombre_elements_supprimes,
        details_techniques: l.details_techniques as never,
      })),
    );
  } catch {
    // Le journal ne doit pas faire échouer la purge.
  }

  return {
    execution_id: executionId,
    dry_run: ctx.dryRun,
    total,
    lignes: [...lignes, resume],
  };
}

function ctx_run(etape: (ctx: Contexte) => Promise<LignePurge>, ctx: Contexte) {
  return etape(ctx);
}
