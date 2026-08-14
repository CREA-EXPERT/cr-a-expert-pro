import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { EncadreSignatureElectronique } from "@/components/EncadresPedago";
import { GuideIdentite } from "@/components/GuideIdentite";
import { ApercuChecklist } from "@/components/ApercuChecklist";
import { MentionConfidentialite } from "@/components/MentionConfidentialite";
import { ListeTransferts, type Transfert } from "@/components/ZoneDepot";
import { AvertissementRejet, TEXTE_AVERTISSEMENT_REJET } from "@/components/AvertissementsPieces";
import { FriseAvancement } from "@/components/FriseAvancement";
import { LigneDepot, type Face } from "@/components/LigneDepot";
import { EncadrePliable } from "@/components/EncadrePliable";

import { genererPdf, telechargerPdf } from "@/lib/pdf";
import { verifierDates, type Associe, type Dossier, type DocumentRow } from "@/lib/documents";
import { preparerImage } from "@/lib/image";
import { verifierPiece } from "@/lib/verification.functions";
import {
  LIBELLE_STATUT,
  aRedeposer,
  categorieControle,
  estPieceIdentite,
  normaliserStatut,
  validerFichier,
} from "@/lib/pieces";
import {
  LABEL_SIGNATURE,
  ORDRE_SIGNATURE,
  etapeCourante,
  type SignataireRow,
  type SignatureRow,
} from "@/lib/signatures";
import type { Tables } from "@/integrations/supabase/types";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Mes documents — CREA EXPERT" },
      {
        name: "description",
        content:
          "Déposez vos pièces, suivez les signatures et consultez le journal de validation de votre dossier.",
      },
      { property: "og:title", content: "Mes documents — CREA EXPERT" },
      {
        property: "og:description",
        content: "Checklist personnalisée des pièces de votre dossier.",
      },
    ],
  }),
  component: Documents,
});

type EventRow = Tables<"events_dossier">;

const horodatage = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

function Documents() {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [associes, setAssocies] = useState<Associe[]>([]);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [signatures, setSignatures] = useState<SignatureRow[]>([]);
  const [signataires, setSignataires] = useState<SignataireRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [transferts, setTransferts] = useState<Transfert[]>([]);
  const [mentions, setMentions] = useState<Record<string, boolean>>({});
  const [apercus, setApercus] = useState<Record<string, { recto?: string; verso?: string }>>({});

  async function charger() {
    const { data: ds } = await supabase
      .from("dossiers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);
    const d = ds?.[0] ?? null;
    setDossier(d);
    if (!d) return;
    const [{ data: as }, { data: dc }, { data: sg }, { data: ev }] = await Promise.all([
      supabase.from("associes").select("*").eq("dossier_id", d.id),
      supabase.from("documents").select("*").eq("dossier_id", d.id).order("created_at"),
      supabase.from("signatures_electroniques").select("*").eq("dossier_id", d.id).order("ordre"),
      supabase
        .from("events_dossier")
        .select("*")
        .eq("dossier_id", d.id)
        .order("created_at", { ascending: false }),
    ]);
    setAssocies(as ?? []);
    setDocs(dc ?? []);
    setSignatures(sg ?? []);
    const idsSig = (sg ?? []).map((s) => s.id);
    if (idsSig.length > 0) {
      const { data: sgn } = await supabase
        .from("signatures_signataires")
        .select("*")
        .in("signature_id", idsSig);
      setSignataires(sgn ?? []);
    } else {
      setSignataires([]);
    }
    setEvents(ev ?? []);
  }

  useEffect(() => {
    charger();
  }, []);

  const nomPersonne = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of associes) {
      m.set(
        a.id,
        a.type === "personne_morale"
          ? (a.denomination ?? "Personne morale")
          : `${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "Associé",
      );
    }
    return m;
  }, [associes]);

  /** Écrit une ligne au journal d'audit du dossier (table en insertion seule). */
  async function journaliser(dossierId: string, type: string, message: string) {
    await supabase
      .from("events_dossier")
      .insert({ dossier_id: dossierId, type_event: type, message });
  }

  async function majDate(
    champ: "date_signature" | "date_depot_fonds" | "date_parution",
    v: string,
  ) {
    if (!dossier) return;
    setDossier({ ...dossier, [champ]: v || null });
    const maj: Record<string, string | null> = { [champ]: v || null };
    await supabase
      .from("dossiers")
      .update(maj as never)
      .eq("id", dossier.id);
  }

  async function majExpiration(doc: DocumentRow, valeur: string) {
    await supabase
      .from("documents")
      .update({ date_expiration: valeur || null })
      .eq("id", doc.id);
  }

  async function televerser(doc: DocumentRow, file: File, face: Face) {
    if (!dossier) return false;
    const refus = validerFichier(file);
    if (refus) {
      toast.error(refus);
      return false;
    }
    if (estPieceIdentite(doc.type_document) && !mentions[doc.id]) {
      toast.error(
        "Avant de déposer votre pièce d'identité, confirmez que la mention manuscrite est recopiée, datée et signée.",
      );
      return false;
    }
    const optimise = await preparerImage(file);
    const extension = (optimise.name.split(".").pop() ?? "pdf")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    /** Chemin déterministe : un redépôt remplace le fichier au lieu d'en créer un doublon. */
    const suffixe = face === "verso" ? "-verso" : "";
    const chemin = `${dossier.id}/${doc.id}${suffixe}.${extension || "pdf"}`;
    const { error } = await supabase.storage
      .from("documents")
      .upload(chemin, optimise, { upsert: true });
    if (error) {
      toast.error("Le dépôt du fichier a échoué. Vérifiez votre connexion puis recommencez.");
      return false;
    }
    const maintenant = new Date().toISOString();
    const maj =
      face === "verso"
        ? { fichier_verso_url: chemin }
        : {
            fichier_url: chemin,
            statut_document: "depose",
            motif_rejet: null,
            depose_le: maintenant,
            atteste_conforme: false,
            atteste_le: null,
            valide_le: null,
          };
    await supabase.from("documents").update(maj).eq("id", doc.id);
    await journaliser(
      dossier.id,
      "piece_deposee",
      `Pièce déposée par le client : ${doc.libelle}${face === "verso" ? " (verso)" : ""} (fichier « ${optimise.name} », ${Math.round(optimise.size / 1024)} Ko).`,
    );
    if (dossier.statut === "dossier_valide_client") {
      await supabase.from("dossiers").update({ statut: "pieces_en_cours" }).eq("id", dossier.id);
    }
    if (optimise.type.startsWith("image/")) {
      const url = URL.createObjectURL(optimise);
      setApercus((a) => ({ ...a, [doc.id]: { ...(a[doc.id] ?? {}), [face]: url } }));
    }
    return true;
  }

  /** Dépose un fichier avec suivi de progression, puis lance la vérification automatique. */
  async function deposer(doc: DocumentRow, fichier: File, face: Face) {
    const idTransfert = `${Date.now()}-${fichier.name}-${Math.random().toString(16).slice(2)}`;
    setTransferts((t) => [
      ...t,
      { id: idTransfert, nom: fichier.name, taille: fichier.size, progression: 8 },
    ]);
    const minuteur = setInterval(() => {
      setTransferts((t) =>
        t.map((x) =>
          x.id === idTransfert ? { ...x, progression: Math.min(92, x.progression + 12) } : x,
        ),
      );
    }, 200);
    const ok = await televerser(doc, fichier, face);
    clearInterval(minuteur);
    setTransferts((t) =>
      t.map((x) =>
        x.id === idTransfert
          ? {
              ...x,
              progression: 100,
              ...(ok ? {} : { erreur: "Ce fichier n'a pas été déposé." }),
            }
          : x,
      ),
    );
    if (ok) setTimeout(() => setTransferts((t) => t.filter((x) => x.id !== idTransfert)), 2500);
    await charger();
    if (ok && categorieControle(doc.type_document)) await lancerVerification(doc);
  }

  /** Vérification automatique : aide au contrôle, la revue humaine reste maîtresse. */
  async function lancerVerification(doc: DocumentRow) {
    setDocs((liste) =>
      liste.map((d) => (d.id === doc.id ? { ...d, verification_statut: "en_cours" } : d)),
    );
    try {
      const r = await verifierPiece({ data: { documentId: doc.id } });
      if (r.synthese === "non_conforme") {
        const motifs = r.controles
          .filter((c) => c.resultat !== "conforme")
          .map((c) => c.motif)
          .join(" ");
        toast.error(`${doc.libelle} : ${motifs} ${TEXTE_AVERTISSEMENT_REJET}`, { duration: 14000 });
      } else if (r.synthese) {
        toast.success(
          "Vérification automatique effectuée — votre pièce sera contrôlée par notre équipe.",
        );
      }
    } catch {
      toast.info(
        "La vérification automatique n'a pas pu être effectuée. Le cabinet contrôlera la pièce.",
      );
    }
    await charger();
  }

  async function supprimerVerso(doc: DocumentRow) {
    await supabase.from("documents").update({ fichier_verso_url: null }).eq("id", doc.id);
    setApercus((a) => {
      const courant = { ...(a[doc.id] ?? {}) };
      delete courant.verso;
      return { ...a, [doc.id]: courant };
    });
    charger();
  }

  async function attester(doc: DocumentRow, coche: boolean) {
    if (!dossier) return;
    if (coche && !doc.fichier_url) {
      toast.error("Déposez d'abord le fichier correspondant.");
      return;
    }
    await supabase
      .from("documents")
      .update({ atteste_conforme: coche, atteste_le: coche ? new Date().toISOString() : null })
      .eq("id", doc.id);
    await journaliser(
      dossier.id,
      coche ? "piece_attestee" : "piece_attestation_retiree",
      coche
        ? `Pièce cochée conforme par le client : ${doc.libelle}.`
        : `Attestation de conformité retirée par le client : ${doc.libelle}.`,
    );
    charger();
  }

  async function telecharger(doc: DocumentRow) {
    if (!dossier) return;
    const erreurs = verifierDates(dossier);
    if (erreurs.length > 0) {
      toast.error(erreurs[0] as string);
      return;
    }
    const octets = await genererPdf(doc.type_document, dossier, associes, doc.associe_id);
    telechargerPdf(octets, doc.libelle);
    await journaliser(
      dossier.id,
      "document_telecharge",
      `Document généré et téléchargé : ${doc.libelle}.`,
    );
    charger();
  }

  if (!dossier) {
    return (
      <PageShell>
        <div className="container-page py-14 text-muted-foreground">
          Aucun dossier en cours. Complétez d'abord votre parcours de création.
        </div>
      </PageShell>
    );
  }

  const erreursDates = verifierDates(dossier);
  const aFournir = docs.filter((d) => d.origine === "a_fournir");
  const generes = docs.filter((d) => d.origine === "genere");
  const manquants = aFournir.filter(
    (d) =>
      d.obligatoire &&
      (!d.fichier_url || !d.atteste_conforme || aRedeposer(normaliserStatut(d.statut_document))),
  );
  const obligatoires = aFournir.filter((d) => d.obligatoire);
  const traitees = obligatoires.filter((d) => !manquants.includes(d));
  const progression =
    obligatoires.length === 0 ? 100 : Math.round((traitees.length / obligatoires.length) * 100);
  const transmis = [
    "en_revue_cabinet",
    "valide_cabinet",
    "pret_au_depot",
    "depose",
    "immatricule",
  ].includes(dossier.statut);

  return (
    <PageShell>
      <div className="container-page max-w-4xl space-y-12 px-4 py-10">
        <header className="space-y-3">
          <h1 className="font-serif text-3xl">Mes documents</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Chaque pièce se dépose sur sa propre ligne, comme au guichet unique : repérez le
            document demandé, puis déposez le fichier correspondant.
          </p>
          <MentionConfidentialite />
        </header>

        <FriseAvancement dossier={dossier} docs={docs} signatures={signatures} />

        <AvertissementRejet />

        <div className="space-y-6">
          <ApercuChecklist dossier={dossier} associes={associes} />
          <GuideIdentite dossier={dossier} associes={associes} />
        </div>

        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mt-0 font-serif text-xl">Dates du dossier</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ds">Signature des statuts</Label>
              <Input
                id="ds"
                type="date"
                value={dossier.date_signature ?? ""}
                onChange={(e) => majDate("date_signature", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dd">Dépôt des fonds</Label>
              <Input
                id="dd"
                type="date"
                value={dossier.date_depot_fonds ?? ""}
                onChange={(e) => majDate("date_depot_fonds", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dp">Parution de l'annonce</Label>
              <Input
                id="dp"
                type="date"
                value={dossier.date_parution ?? ""}
                onChange={(e) => majDate("date_parution", e.target.value)}
              />
            </div>
          </div>
          {erreursDates.length > 0 && (
            <ul className="mt-6 space-y-1 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
              {erreursDates.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <p className="mt-6 max-w-prose text-sm leading-relaxed text-muted-foreground">
            Les statuts et leurs annexes portent tous la date de signature. L'attestation de dépôt
            des fonds doit lui être antérieure ou du même jour ; l'attestation de parution
            postérieure ou du même jour.
          </p>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="font-serif text-2xl">À nous fournir</h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
              Cette liste dépend de votre situation : forme juridique, associés, régime matrimonial,
              type de siège. Chaque pièce obligatoire doit être déposée puis cochée conforme avant
              que le dossier puisse partir au cabinet.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium">Avancement de vos pièces</p>
              <p className="text-xs text-muted-foreground">
                {traitees.length} / {obligatoires.length} pièce(s) obligatoire(s) en règle
              </p>
            </div>
            <Progress
              value={progression}
              className="mt-3 h-2"
              aria-label="Progression des pièces obligatoires"
            />
            <ListeTransferts
              transferts={transferts}
              onSupprimer={(id) => setTransferts((t) => t.filter((x) => x.id !== id))}
            />
          </div>

          <ul className="space-y-6">
            {aFournir.length === 0 && (
              <li className="text-sm text-muted-foreground">
                Aucune pièce demandée pour le moment.
              </li>
            )}
            {aFournir.map((d) => (
              <LigneDepot
                key={d.id}
                doc={d}
                personne={d.associe_id ? (nomPersonne.get(d.associe_id) ?? null) : null}
                transmis={transmis}
                mentionOk={mentions[d.id] === true}
                onMention={(v) => setMentions((m) => ({ ...m, [d.id]: v }))}
                onFichier={(f, face) => deposer(d, f, face)}
                onAttester={(v) => attester(d, v)}
                onSupprimerVerso={() => supprimerVerso(d)}
                onExpiration={(v) => majExpiration(d, v)}
                apercus={apercus[d.id] ?? {}}
              />
            ))}
          </ul>

          {aFournir.length > 0 && (
            <div className="rounded-lg border border-accent/40 bg-accent/8 p-6">
              {transmis ? (
                <p className="max-w-prose text-sm leading-relaxed">
                  Vos justificatifs ont été transmis au cabinet. Toute nouvelle pièce déposée est
                  également enregistrée au journal du dossier.
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium">
                    {manquants.length === 0
                      ? "Toutes les pièces obligatoires sont déposées et attestées conformes."
                      : `${manquants.length} pièce(s) obligatoire(s) restent à régulariser.`}
                  </p>
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                    La transmission se fait depuis l'écran de vérification finale, qui contrôle
                    l'ensemble de votre dossier avant envoi.
                  </p>
                  <Button className="mt-4" asChild disabled={busy}>
                    <Link to="/verification-finale">Vérifier et transmettre mon dossier</Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <h2 className="font-serif text-2xl">Signature électronique</h2>
          <EncadrePliable titre="Comment se déroule la signature électronique ?">
            <EncadreSignatureElectronique />
          </EncadrePliable>
          <ul className="space-y-6">
            {signatures.length === 0 && (
              <li className="text-sm text-muted-foreground">
                Le suivi apparaîtra dès la validation de votre dossier.
              </li>
            )}
            {signatures.map((s) => {
              const courant = etapeCourante(s.statut);
              const lignes = signataires.filter((x) => x.signature_id === s.id);
              return (
                <li key={s.id} className="rounded-lg border border-border bg-surface p-6">
                  <p className="font-medium">{s.libelle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{LABEL_SIGNATURE(s.statut)}</p>
                  <ol className="mt-4 grid gap-2 sm:grid-cols-4">
                    {ORDRE_SIGNATURE.map((etape, i) => (
                      <li
                        key={etape}
                        className={`rounded-md border p-2 text-xs ${
                          i <= courant
                            ? "border-accent bg-accent/10 font-medium"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {LABEL_SIGNATURE(etape)}
                      </li>
                    ))}
                  </ol>
                  {lignes.length > 0 && (
                    <ul className="mt-4 space-y-1">
                      {lignes.map((l) => (
                        <li key={l.id} className="text-xs text-muted-foreground">
                          {l.signataire_nom} —{" "}
                          {l.horodatage
                            ? `signé le ${new Date(l.horodatage).toLocaleString("fr-FR")}`
                            : "en attente de signature"}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Envoyé le {horodatage(s.envoye_le)} · signé le {horodatage(s.signe_le)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="font-serif text-2xl">Générés pour vous</h2>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              Ces documents portent le filigrane « PROJET — soumis à la validation du cabinet ».
            </p>
          </div>
          <ul className="space-y-4">
            {generes.length === 0 && (
              <li className="text-sm text-muted-foreground">
                Aucun document généré pour le moment.
              </li>
            )}
            {generes.map((d) => {
              const badge = LIBELLE_STATUT[normaliserStatut(d.statut_document)];
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-6"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{d.libelle}</p>
                    <span
                      className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => telecharger(d)}>
                    <Download strokeWidth={1.5} /> Télécharger
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="font-serif text-2xl">Journal de validation</h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
              Chaque dépôt, chaque attestation de conformité et chaque décision du cabinet est
              horodaté et conservé. Ce journal ne peut être ni modifié ni supprimé.
            </p>
          </div>
          <ol className="space-y-3">
            {events.length === 0 && (
              <li className="text-sm text-muted-foreground">Aucun événement enregistré.</li>
            )}
            {events.map((e) => (
              <li key={e.id} className="rounded-lg border border-border bg-surface p-4">
                <p className="text-xs text-muted-foreground">{horodatage(e.created_at)}</p>
                <p className="mt-1 max-w-prose text-sm leading-relaxed">{e.message}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </PageShell>
  );
}
