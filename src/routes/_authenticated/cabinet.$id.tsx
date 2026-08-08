import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Disclaimer } from "@/components/Disclaimer";
import { STATUTS, STATUT_LABEL, euro } from "@/lib/domain";
import type { Associe, DocumentRow, Dossier } from "@/lib/documents";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUT_PIECE: Record<string, string> = {
  a_fournir: "À fournir",
  recu: "Reçue, à contrôler",
  valide: "Validée",
  rejete: "À corriger",
};

export const Route = createFileRoute("/_authenticated/cabinet/$id")({
  head: () => ({
    meta: [
      { title: "Revue de dossier — CREA EXPERT" },
      { name: "description", content: "Revue cabinet d'un dossier de création de société : pièces, informations et validation." },
      { property: "og:title", content: "Revue de dossier — CREA EXPERT" },
      { property: "og:description", content: "Validation des pièces et du dossier par le cabinet." },
    ],
  }),
  component: CabinetDossier,
});

function CabinetDossier() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { isCabinet, loading: rolesLoading } = useRoles(user);
  const qc = useQueryClient();
  const [motifs, setMotifs] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["cabinet-dossier", id],
    enabled: isCabinet,
    queryFn: async () => {
      const [{ data: d }, { data: as }, { data: dc }, { data: ev }] = await Promise.all([
        supabase.from("dossiers").select("*").eq("id", id).maybeSingle(),
        supabase.from("associes").select("*").eq("dossier_id", id),
        supabase.from("documents").select("*").eq("dossier_id", id).order("created_at"),
        supabase.from("events_dossier").select("*").eq("dossier_id", id).order("created_at", { ascending: false }),
      ]);
      return {
        dossier: (d ?? null) as Dossier | null,
        associes: (as ?? []) as Associe[],
        docs: (dc ?? []) as DocumentRow[],
        events: ev ?? [],
      };
    },
  });

  async function journaliser(message: string) {
    await supabase.from("events_dossier").insert({ dossier_id: id, type_event: "cabinet", message });
  }

  async function majDocument(docId: string, statut: string, motif?: string) {
    const motifNet = (motif ?? "").trim();
    if (statut === "rejete" && motifNet.length < 5) {
      toast.error("Le motif de rejet est obligatoire (5 caractères minimum).");
      return;
    }
    const { error } = await supabase
      .from("documents")
      .update({ statut_document: statut, motif_rejet: statut === "rejete" ? motifNet : null })
      .eq("id", docId);
    if (error) {
      toast.error("Mise à jour impossible.");
      return;
    }
    const doc = data?.docs.find((d) => d.id === docId);
    await journaliser(
      statut === "valide"
        ? `Pièce validée par le cabinet : ${doc?.libelle}`
        : `Pièce à corriger — ${doc?.libelle} : ${motifNet}`,
    );
    if (statut === "rejete") setMotifs((m) => ({ ...m, [docId]: "" }));
    toast.success("Pièce mise à jour.");
    qc.invalidateQueries({ queryKey: ["cabinet-dossier", id] });
  }

  async function ouvrirPiece(chemin: string | null) {
    if (!chemin) {
      toast.error("Aucun fichier déposé pour cette pièce.");
      return;
    }
    const { data: signed, error } = await supabase.storage.from("documents").createSignedUrl(chemin, 300);
    if (error || !signed) {
      toast.error("Impossible d'ouvrir le fichier.");
      return;
    }
    window.open(signed.signedUrl, "_blank", "noopener");
  }

  async function majStatut(statut: string) {
    const { error } = await supabase.from("dossiers").update({ statut }).eq("id", id);
    if (error) {
      toast.error("Mise à jour impossible.");
      return;
    }
    await journaliser(`Statut du dossier : ${STATUT_LABEL[statut] ?? statut}`);
    toast.success("Statut mis à jour.");
    qc.invalidateQueries({ queryKey: ["cabinet-dossier", id] });
  }

  async function validerDossier() {
    const horodatage = new Date().toISOString();
    const validateur = user?.email ?? "cabinet";
    const { error } = await supabase
      .from("dossiers")
      .update({ statut: "valide_cabinet", valide_par: validateur, valide_le: horodatage })
      .eq("id", id);
    if (error) {
      toast.error("Validation impossible.");
      return;
    }
    await journaliser(
      `Dossier validé par le cabinet — ${validateur}, le ${new Date(horodatage).toLocaleString("fr-FR")}. Les documents ne portent plus la mention « PROJET ».`,
    );
    setConfirmation(false);
    toast.success("Dossier validé.");
    qc.invalidateQueries({ queryKey: ["cabinet-dossier", id] });
  }

  if (rolesLoading || isLoading) {
    return (
      <PageShell>
        <div className="container-page py-14 text-muted-foreground">Chargement…</div>
      </PageShell>
    );
  }

  if (!isCabinet) {
    return (
      <PageShell>
        <div className="container-page max-w-xl py-14">
          <h1 className="font-serif text-3xl">Accès réservé</h1>
          <p className="mt-3 text-muted-foreground">Cet espace est réservé au cabinet partenaire.</p>
        </div>
      </PageShell>
    );
  }

  const dossier = data?.dossier;
  if (!dossier) {
    return (
      <PageShell>
        <div className="container-page max-w-xl py-14">
          <h1 className="font-serif text-3xl">Dossier introuvable</h1>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/cabinet">Retour à la liste</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const manquantes = (data?.docs ?? []).filter((d) => d.obligatoire && d.statut_document !== "valide");

  return (
    <PageShell>
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div>
            <Link to="/cabinet" className="text-sm text-muted-foreground hover:text-foreground">
              ← Tous les dossiers
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-3xl">{dossier.denomination || "Dossier"}</h1>
              <Badge variant="secondary">{dossier.forme_juridique}</Badge>
              {dossier.routage_cabinet && <Badge>Accompagnement requis</Badge>}
            </div>
            {dossier.valide_le && (
              <p className="mt-2 text-sm text-success">
                Validé par {dossier.valide_par} le {new Date(dossier.valide_le).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>

          <section className="rounded-lg border border-border bg-surface p-6">
            <h2 className="font-serif text-xl">Informations du dossier</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Info label="Objet social" value={dossier.objet_social} />
              <Info label="Siège" value={dossier.siege_adresse} />
              <Info label="Capital" value={euro(Number(dossier.capital_montant))} />
              <Info label="Libération" value={`${dossier.capital_liberation} %`} />
              <Info label="Durée" value={`${dossier.duree_annees} ans`} />
              <Info label="Clôture de l'exercice" value={dossier.date_cloture_exercice} />
              <Info label="Option fiscale" value={dossier.option_fiscale} />
              <Info label="Régime de TVA" value={dossier.regime_tva} />
              <Info label="Activité réglementée" value={dossier.activite_reglementee ? "Oui" : "Non"} />
              <Info label="Apport en nature" value={dossier.apport_nature ? "Oui" : "Non"} />
              <Info label="Demande ACRE" value={dossier.demande_acre ? "Oui" : "Non"} />
              <Info label="Signature des statuts" value={dossier.date_signature} />
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-surface p-6">
            <h2 className="font-serif text-xl">Associés et dirigeants</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {(data?.associes ?? []).map((a) => (
                <li key={a.id} className="rounded-md border border-border p-3">
                  <p className="font-medium">
                    {a.type === "personne_morale"
                      ? (a.denomination ?? "Personne morale")
                      : `${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "Associé"}
                  </p>
                  <p className="text-muted-foreground">
                    {a.nb_titres} titre(s) · {euro(Number(a.montant_apport))}
                    {a.est_dirigeant && a.fonction ? ` · ${a.fonction}` : ""}
                  </p>
                </li>
              ))}
              {(data?.associes ?? []).length === 0 && (
                <li className="text-muted-foreground">Aucun associé renseigné.</li>
              )}
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-surface p-6">
            <h2 className="font-serif text-xl">Pièces du dossier</h2>
            <ul className="mt-4 space-y-3">
              {(data?.docs ?? []).map((d) => (
                <li key={d.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{d.libelle}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.origine === "genere" ? "Généré par la plateforme" : "À fournir par le client"} ·{" "}
                        {d.obligatoire ? "Obligatoire" : "Facultative"} · {STATUT_PIECE[d.statut_document] ?? d.statut_document}
                      </p>
                      {d.motif_rejet && <p className="mt-1 text-xs text-destructive">Motif : {d.motif_rejet}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!d.fichier_url}
                        onClick={() => ouvrirPiece(d.fichier_url)}
                      >
                        {d.fichier_url ? "Voir la pièce" : "Non déposée"}
                      </Button>
                      <Input
                        className="h-9 w-48"
                        placeholder="Motif de rejet (obligatoire)"
                        value={motifs[d.id] ?? ""}
                        onChange={(e) => setMotifs((m) => ({ ...m, [d.id]: e.target.value }))}
                      />
                      <Button size="sm" variant="outline" onClick={() => majDocument(d.id, "rejete", motifs[d.id])}>
                        Rejeter
                      </Button>
                      <Button size="sm" onClick={() => majDocument(d.id, "valide")}>
                        Valider
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
              {(data?.docs ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">Aucune pièce générée pour ce dossier.</li>
              )}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="font-serif text-xl">Traitement</h2>
            <div className="mt-4 space-y-2">
              <Label htmlFor="statut">Statut du dossier</Label>
              <Select value={dossier.statut} onValueChange={majStatut}>
                <SelectTrigger id="statut">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUT_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {manquantes.length > 0 && (
              <p className="mt-4 rounded-md border border-border bg-muted p-3 text-sm">
                {manquantes.length} pièce(s) obligatoire(s) non validée(s). La validation du dossier retire le
                filigrane « PROJET » des documents générés.
              </p>
            )}
            {dossier.valide_le ? (
              <p className="mt-4 rounded-md border border-border bg-muted p-3 text-sm">
                Dossier validé par {dossier.valide_par} le{" "}
                {new Date(dossier.valide_le).toLocaleString("fr-FR")}.
              </p>
            ) : (
              <Button className="mt-4 w-full" onClick={() => setConfirmation(true)}>
                VALIDER LE DOSSIER
              </Button>
            )}
            <AlertDialog open={confirmation} onOpenChange={setConfirmation}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Valider définitivement ce dossier ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    La validation est horodatée et enregistrée à votre nom ({user?.email}). Elle retire la mention
                    « PROJET » des documents générés et en informe le client dans son suivi.
                    {manquantes.length > 0
                      ? ` ${manquantes.length} pièce(s) obligatoire(s) ne sont pas encore validées.`
                      : ""}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={validerDossier}>Valider le dossier</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="mt-4">
              <Disclaimer />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="font-serif text-xl">Historique</h2>
            <ol className="mt-4 space-y-3 border-l border-border pl-4">
              {(data?.events ?? []).map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-accent" aria-hidden />
                  <p className="text-sm">{e.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("fr-FR")}
                  </p>
                </li>
              ))}
              {(data?.events ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">Aucun événement.</li>
              )}
            </ol>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}
