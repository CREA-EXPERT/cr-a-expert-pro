import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  EncadreJustificatifs,
  EncadreSignatureElectronique,
} from "@/components/EncadresPedago";
import { GuideIdentite } from "@/components/GuideIdentite";
import { ApercuChecklist } from "@/components/ApercuChecklist";
import { MentionConfidentialite } from "@/components/MentionConfidentialite";
import { ListeTransferts, ZoneDepot, type Transfert } from "@/components/ZoneDepot";

import { genererPdf, telechargerPdf } from "@/lib/pdf";
import { verifierDates, type Associe, type Dossier, type DocumentRow } from "@/lib/documents";
import {
  ACCEPT_ATTR,
  LIBELLE_STATUT,
  aRedeposer,
  estPieceIdentite,
  normaliserStatut,
  validerFichier,
} from "@/lib/pieces";
import { LABEL_SIGNATURE, ORDRE_SIGNATURE, type SignatureRow } from "@/lib/signatures";
import type { Tables } from "@/integrations/supabase/types";
import { Download, HelpCircle, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Mes documents — CREA EXPERT" },
      { name: "description", content: "Déposez vos pièces, suivez les signatures et consultez le journal de validation de votre dossier." },
      { property: "og:title", content: "Mes documents — CREA EXPERT" },
      { property: "og:description", content: "Checklist personnalisée des pièces de votre dossier." },
    ],
  }),
  component: Documents,
});

type EventRow = Tables<"events_dossier">;

const CIBLE_LIBRE = "autre";

const horodatage = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

function Documents() {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [associes, setAssocies] = useState<Associe[]>([]);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [signatures, setSignatures] = useState<SignatureRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [transferts, setTransferts] = useState<Transfert[]>([]);
  const [mentions, setMentions] = useState<Record<string, boolean>>({});
  const [cible, setCible] = useState<string>(CIBLE_LIBRE);

  async function charger() {
    const { data: ds } = await supabase.from("dossiers").select("*").order("created_at", { ascending: false }).limit(1);
    const d = ds?.[0] ?? null;
    setDossier(d);
    if (!d) return;
    const [{ data: as }, { data: dc }, { data: sg }, { data: ev }] = await Promise.all([
      supabase.from("associes").select("*").eq("dossier_id", d.id),
      supabase.from("documents").select("*").eq("dossier_id", d.id).order("created_at"),
      supabase.from("signatures_electroniques").select("*").eq("dossier_id", d.id).order("ordre"),
      supabase.from("events_dossier").select("*").eq("dossier_id", d.id).order("created_at", { ascending: false }),
    ]);
    setAssocies(as ?? []);
    setDocs(dc ?? []);
    setSignatures(sg ?? []);
    setEvents(ev ?? []);
  }

  useEffect(() => {
    charger();
  }, []);

  /** Écrit une ligne au journal d'audit du dossier (table en insertion seule). */
  async function journaliser(dossierId: string, type: string, message: string) {
    await supabase.from("events_dossier").insert({ dossier_id: dossierId, type_event: type, message });
  }

  async function majDate(champ: "date_signature" | "date_depot_fonds" | "date_parution", v: string) {
    if (!dossier) return;
    setDossier({ ...dossier, [champ]: v || null });
    const maj: Record<string, string | null> = { [champ]: v || null };
    await supabase.from("dossiers").update(maj as never).eq("id", dossier.id);
  }

  /** Crée une pièce hors checklist lorsque le client dépose un fichier non rattaché. */
  async function creerPieceLibre(nom: string): Promise<DocumentRow | null> {
    if (!dossier) return null;
    const { data, error } = await supabase
      .from("documents")
      .insert({
        dossier_id: dossier.id,
        type_document: "piece_complementaire",
        libelle: `Pièce complémentaire — ${nom}`,
        obligatoire: false,
        origine: "a_fournir",
        statut_document: "a_fournir",
      })
      .select("*")
      .maybeSingle();
    if (error || !data) {
      toast.error("La pièce complémentaire n'a pas pu être créée.");
      return null;
    }
    return data as DocumentRow;
  }

  async function televerser(doc: DocumentRow, file: File) {
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
    const extension = (file.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
    /** Chemin déterministe : un redépôt remplace le fichier au lieu d'en créer un doublon. */
    const chemin = `${dossier.id}/${doc.id}.${extension || "pdf"}`;
    const { error } = await supabase.storage.from("documents").upload(chemin, file, { upsert: true });
    if (error) {
      toast.error("Le dépôt du fichier a échoué. Vérifiez votre connexion puis recommencez.");
      return false;
    }
    const maintenant = new Date().toISOString();
    await supabase
      .from("documents")
      .update({
        fichier_url: chemin,
        statut_document: "depose",
        motif_rejet: null,
        depose_le: maintenant,
        atteste_conforme: false,
        atteste_le: null,
        valide_le: null,
      })
      .eq("id", doc.id);
    await journaliser(
      dossier.id,
      "piece_deposee",
      `Pièce déposée par le client : ${doc.libelle} (fichier « ${file.name} », ${Math.round(file.size / 1024)} Ko).`,
    );
    if (dossier.statut === "dossier_valide_client") {
      await supabase.from("dossiers").update({ statut: "pieces_en_cours" }).eq("id", dossier.id);
    }
    return true;
  }

  /** Dépose une série de fichiers avec suivi de progression, puis rafraîchit la liste. */
  async function deposer(fichiers: File[], cibleId: string) {
    for (const f of fichiers) {
      const idTransfert = `${Date.now()}-${f.name}-${Math.random().toString(16).slice(2)}`;
      setTransferts((t) => [...t, { id: idTransfert, nom: f.name, taille: f.size, progression: 8 }]);
      const minuteur = setInterval(() => {
        setTransferts((t) =>
          t.map((x) => (x.id === idTransfert ? { ...x, progression: Math.min(92, x.progression + 12) } : x)),
        );
      }, 200);
      const doc = cibleId === CIBLE_LIBRE ? await creerPieceLibre(f.name) : (docs.find((d) => d.id === cibleId) ?? null);
      const ok = doc ? await televerser(doc, f) : false;
      clearInterval(minuteur);
      setTransferts((t) =>
        t.map((x) =>
          x.id === idTransfert
            ? { ...x, progression: 100, ...(ok ? {} : { erreur: "Ce fichier n'a pas été déposé." }) }
            : x,
        ),
      );
      if (ok) setTimeout(() => setTransferts((t) => t.filter((x) => x.id !== idTransfert)), 2500);
    }
    toast.success("Dépôt terminé.");
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
    await journaliser(dossier.id, "document_telecharge", `Document généré et téléchargé : ${doc.libelle}.`);
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
    (d) => d.obligatoire && (!d.fichier_url || !d.atteste_conforme || d.statut_document === "rejete"),
  );
  const transmis = ["en_revue_cabinet", "valide_cabinet", "pret_au_depot", "depose", "immatricule"].includes(
    dossier.statut,
  );

  async function transmettre() {
    if (!dossier || manquants.length > 0) return;
    setBusy(true);
    await supabase.from("dossiers").update({ statut: "en_revue_cabinet" }).eq("id", dossier.id);
    await journaliser(
      dossier.id,
      "pieces_transmises",
      `Justificatifs transmis au cabinet : ${aFournir.length} pièce(s), toutes déposées et attestées conformes par le client.`,
    );
    setBusy(false);
    toast.success("Vos pièces sont transmises au cabinet.");
    charger();
  }

  const Ligne = ({ d, genere }: { d: DocumentRow; genere: boolean }) => {
    const badge = STATUT_BADGE[d.statut_document] ?? STATUT_BADGE["a_fournir"]!;
    return (
      <li className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">
              {d.libelle}
              {!genere && !d.obligatoire && (
                <span className="text-sm font-normal text-muted-foreground"> — facultatif</span>
              )}
            </p>
            <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs ${badge.cls}`}>{badge.label}</span>
          </div>
          {genere ? (
            <Button size="sm" variant="outline" onClick={() => telecharger(d)}>
              <Download strokeWidth={1.5} /> Télécharger
            </Button>
          ) : (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:border-accent">
              <Upload className="size-4" strokeWidth={1.5} aria-hidden />
              {d.fichier_url ? "Remplacer" : "Déposer"}
              <input
                type="file"
                className="sr-only"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) televerser(d, f);
                }}
              />
            </label>
          )}
        </div>

        {!genere && (
          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id={`att-${d.id}`}
                className="mt-0.5"
                checked={d.atteste_conforme}
                disabled={!d.fichier_url || transmis}
                onCheckedChange={(v) => attester(d, v === true)}
              />
              <Label htmlFor={`att-${d.id}`} className="text-sm font-normal text-justify">
                Je certifie que cette pièce est complète, lisible, en cours de validité et conforme à
                l'original.
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Déposée le {horodatage(d.depose_le)} · cochée conforme le {horodatage(d.atteste_le)} ·
              acceptée par le cabinet le {horodatage(d.valide_le)}
            </p>
          </div>
        )}

        {d.statut_document === "rejete" && d.motif_rejet && (
          <p className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <strong>Pièce à corriger :</strong> {d.motif_rejet}
          </p>
        )}

        {d.aide_client && (
          <Collapsible>
            <CollapsibleTrigger className="mt-3 inline-flex items-center gap-1.5 text-sm underline underline-offset-2">
              <HelpCircle className="size-4" strokeWidth={1.5} aria-hidden /> Aide
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed">
              {d.aide_client}
            </CollapsibleContent>
          </Collapsible>
        )}
      </li>
    );
  };

  return (
    <PageShell>
      <div className="container-page max-w-4xl py-10">
        <h1 className="font-serif text-3xl">Mes documents</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Formats acceptés : PDF, JPG, PNG. 10 Mo maximum par fichier.
        </p>
        <MentionConfidentialite className="mt-2" />


        <div className="mt-6 space-y-5">
          {dossier && <ApercuChecklist dossier={dossier} associes={associes} />}
          <EncadreJustificatifs />
          <GuideIdentite dossier={dossier} associes={associes} />
        </div>

        <section className="mt-6 rounded-lg border border-border bg-surface p-5">
          <h2 className="font-serif text-xl">Dates du dossier</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ds">Signature des statuts</Label>
              <Input id="ds" type="date" value={dossier.date_signature ?? ""} onChange={(e) => majDate("date_signature", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dd">Dépôt des fonds</Label>
              <Input id="dd" type="date" value={dossier.date_depot_fonds ?? ""} onChange={(e) => majDate("date_depot_fonds", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dp">Parution de l'annonce</Label>
              <Input id="dp" type="date" value={dossier.date_parution ?? ""} onChange={(e) => majDate("date_parution", e.target.value)} />
            </div>
          </div>
          {erreursDates.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
              {erreursDates.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-muted-foreground text-justify">
            Les statuts et leurs annexes portent tous la date de signature. L'attestation de dépôt
            des fonds doit lui être antérieure ou du même jour ; l'attestation de parution
            postérieure ou du même jour. La génération des documents est bloquée tant que cet ordre
            n'est pas respecté.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-serif text-2xl">À nous fournir</h2>
          <p className="mt-1 text-sm text-muted-foreground text-justify">
            Cette liste dépend de votre situation : forme juridique, associés, régime matrimonial,
            type de siège. Chaque pièce obligatoire doit être déposée puis cochée conforme avant que
            le dossier puisse partir au cabinet.
          </p>
          <ul className="mt-4 space-y-3">
            {aFournir.length === 0 && <li className="text-sm text-muted-foreground">Aucune pièce demandée pour le moment.</li>}
            {aFournir.map((d) => (
              <Ligne key={d.id} d={d} genere={false} />
            ))}
          </ul>

          {aFournir.length > 0 && (
            <div className="mt-5 rounded-lg border border-accent/40 bg-accent/8 p-4">
              {transmis ? (
                <p className="text-sm">
                  Vos justificatifs ont été transmis au cabinet. Toute nouvelle pièce déposée est
                  également enregistrée au journal du dossier.
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium">
                    {manquants.length === 0
                      ? "Toutes les pièces obligatoires sont déposées et attestées conformes."
                      : `Validation bloquée : ${manquants.length} pièce(s) obligatoire(s) restent à régulariser.`}
                  </p>
                  {manquants.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                      {manquants.map((d) => (
                        <li key={d.id}>
                          {d.libelle} —{" "}
                          {d.statut_document === "rejete"
                            ? "à corriger puis à redéposer"
                            : !d.fichier_url
                              ? "fichier non déposé"
                              : "à cocher comme conforme"}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    className="mt-4"
                    disabled={manquants.length > 0 || busy}
                    onClick={transmettre}
                  >
                    {busy ? "Transmission…" : "Transmettre mes pièces au cabinet"}
                  </Button>
                </>
              )}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="font-serif text-2xl">Signature électronique</h2>
          <div className="mt-4 space-y-4">
            <EncadreSignatureElectronique />
            <ul className="space-y-3">
              {signatures.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  Le suivi apparaîtra dès la validation de votre dossier.
                </li>
              )}
              {signatures.map((s) => {
                const courant = Math.max(ORDRE_SIGNATURE.indexOf(s.statut), 0);
                return (
                  <li key={s.id} className="rounded-lg border border-border bg-surface p-4">
                    <p className="font-medium">{s.libelle}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{LABEL_SIGNATURE(s.statut)}</p>
                    <ol className="mt-3 grid gap-2 sm:grid-cols-4">
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
                    <p className="mt-2 text-xs text-muted-foreground">
                      Envoyé le {horodatage(s.envoye_le)} · signé le {horodatage(s.signe_le)}
                    </p>
                    {s.aide_client && (
                      <p className="mt-2 text-sm leading-relaxed text-justify text-muted-foreground">
                        {s.aide_client}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-serif text-2xl">Générés pour vous</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ces documents portent le filigrane « PROJET — soumis à la validation du cabinet ».
          </p>
          <ul className="mt-4 space-y-3">
            {generes.length === 0 && <li className="text-sm text-muted-foreground">Aucun document généré pour le moment.</li>}
            {generes.map((d) => (
              <Ligne key={d.id} d={d} genere />
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="font-serif text-2xl">Journal de validation</h2>
          <p className="mt-1 text-sm text-muted-foreground text-justify">
            Chaque dépôt, chaque attestation de conformité et chaque décision du cabinet est
            horodaté et conservé. Ce journal ne peut être ni modifié ni supprimé : il permet de
            vérifier à tout moment l'historique de votre dossier.
          </p>
          <ol className="mt-4 space-y-3">
            {events.length === 0 && <li className="text-sm text-muted-foreground">Aucun événement enregistré.</li>}
            {events.map((e) => (
              <li key={e.id} className="rounded-lg border border-border bg-surface p-3">
                <p className="text-xs text-muted-foreground">{horodatage(e.created_at)}</p>
                <p className="mt-1 text-sm leading-relaxed text-justify">{e.message}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </PageShell>
  );
}
