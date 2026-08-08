import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { genererPdf, telechargerPdf } from "@/lib/pdf";
import { verifierDates, type Associe, type Dossier, type DocumentRow } from "@/lib/documents";
import { Download, HelpCircle, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Mes documents — CREA EXPERT" },
      { name: "description", content: "Déposez vos pièces et téléchargez les documents générés pour votre dossier." },
      { property: "og:title", content: "Mes documents — CREA EXPERT" },
      { property: "og:description", content: "Checklist personnalisée des pièces de votre dossier." },
    ],
  }),
  component: Documents,
});

const STATUT_BADGE: Record<string, { label: string; cls: string }> = {
  a_fournir: { label: "À fournir", cls: "bg-muted text-foreground" },
  recu: { label: "Reçu", cls: "bg-info text-info-foreground" },
  valide: { label: "Validé", cls: "bg-success text-success-foreground" },
  rejete: { label: "Rejeté", cls: "bg-destructive text-destructive-foreground" },
};

function Documents() {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [associes, setAssocies] = useState<Associe[]>([]);
  const [docs, setDocs] = useState<DocumentRow[]>([]);

  async function charger() {
    const { data: ds } = await supabase.from("dossiers").select("*").order("created_at", { ascending: false }).limit(1);
    const d = ds?.[0] ?? null;
    setDossier(d);
    if (!d) return;
    const [{ data: as }, { data: dc }] = await Promise.all([
      supabase.from("associes").select("*").eq("dossier_id", d.id),
      supabase.from("documents").select("*").eq("dossier_id", d.id).order("created_at"),
    ]);
    setAssocies(as ?? []);
    setDocs(dc ?? []);
  }

  useEffect(() => {
    charger();
  }, []);

  async function majDate(champ: "date_signature" | "date_depot_fonds" | "date_parution", v: string) {
    if (!dossier) return;
    setDossier({ ...dossier, [champ]: v || null });
    const maj: Record<string, string | null> = { [champ]: v || null };
    await supabase.from("dossiers").update(maj as never).eq("id", dossier.id);

  }

  async function televerser(doc: DocumentRow, file: File) {
    if (!dossier) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier dépasse 10 Mo.");
      return;
    }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Formats acceptés : PDF, JPG, PNG.");
      return;
    }
    const chemin = `${dossier.id}/${doc.id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const { error } = await supabase.storage.from("documents").upload(chemin, file, { upsert: true });
    if (error) {
      toast.error("Le dépôt du fichier a échoué.");
      return;
    }
    await supabase.from("documents").update({ fichier_url: chemin, statut_document: "recu", motif_rejet: null }).eq("id", doc.id);
    await supabase.from("events_dossier").insert({
      dossier_id: dossier.id,
      type_event: "piece_deposee",
      message: `Pièce déposée : ${doc.libelle}`,
    });
    if (dossier.statut === "dossier_valide_client") {
      await supabase.from("dossiers").update({ statut: "pieces_en_cours" }).eq("id", dossier.id);
    }
    toast.success("Pièce déposée.");
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

  const Ligne = ({ d, genere }: { d: DocumentRow; genere: boolean }) => {
    const badge = STATUT_BADGE[d.statut_document] ?? STATUT_BADGE["a_fournir"]!;
    return (
      <li className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{d.libelle}</p>
            <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs ${badge.cls}`}>{badge.label}</span>
          </div>
          {genere ? (
            <Button size="sm" variant="outline" onClick={() => telecharger(d)}>
              <Download strokeWidth={1.5} /> Télécharger
            </Button>
          ) : (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:border-accent">
              <Upload className="size-4" strokeWidth={1.5} aria-hidden />
              Déposer
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

        {d.statut_document === "rejete" && d.motif_rejet && (
          <p className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <strong>Pièce rejetée par le cabinet :</strong> {d.motif_rejet}
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

        <div className="mt-6 space-y-5">
          <EncadreJustificatifs />
          <EncadreSignatureElectronique />
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
          <p className="mt-3 text-sm text-muted-foreground">
            Les statuts et leurs annexes portent tous la date de signature. L'attestation de dépôt
            des fonds doit lui être antérieure ou du même jour ; l'attestation de parution
            postérieure ou du même jour. La génération des documents est bloquée tant que cet ordre
            n'est pas respecté.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-serif text-2xl">À nous fournir</h2>
          <ul className="mt-4 space-y-3">
            {aFournir.length === 0 && <li className="text-sm text-muted-foreground">Aucune pièce demandée pour le moment.</li>}
            {aFournir.map((d) => (
              <Ligne key={d.id} d={d} genere={false} />
            ))}
          </ul>
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
      </div>
    </PageShell>
  );
}
