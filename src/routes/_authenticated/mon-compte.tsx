import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Download, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { exporterMesDonnees, supprimerMonCompte } from "@/lib/rgpd.functions";

export const Route = createFileRoute("/_authenticated/mon-compte")({
  head: () => ({
    meta: [
      { title: "Mon compte et mes données — CREA EXPERT" },
      {
        name: "description",
        content:
          "Exportez les données de votre compte CREA EXPERT ou demandez leur suppression, conformément au RGPD.",
      },
      { property: "og:title", content: "Mon compte et mes données — CREA EXPERT" },
      { property: "og:description", content: "Exercer vos droits d'accès, de portabilité et d'effacement." },
    ],
  }),
  component: MonCompte,
});

type Etat = "inactif" | "en_cours" | "termine" | "erreur";

const DONNEES_CONSERVEES = [
  "Dénomination et forme juridique du (des) dossier(s), dissociées de votre identité",
  "Date de création du dossier et date d'acceptation de la lettre de mission",
  "Existence d'un moyen de paiement enregistré et statut de la relecture",
];

function Statut({ etat, libelles }: { etat: Etat; libelles: Record<"en_cours" | "termine" | "erreur", string> }) {
  if (etat === "inactif") return null;
  const Icone = etat === "en_cours" ? Loader2 : etat === "termine" ? CheckCircle2 : AlertCircle;
  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <Icone
        className={`size-4 ${etat === "en_cours" ? "animate-spin" : ""}`}
        strokeWidth={1.5}
        aria-hidden
      />
      {libelles[etat]}
    </p>
  );
}

function MonCompte() {
  const navigate = useNavigate();
  const exporter = useServerFn(exporterMesDonnees);
  const supprimer = useServerFn(supprimerMonCompte);
  const [etatExport, setEtatExport] = useState<Etat>("inactif");
  const [etatSuppression, setEtatSuppression] = useState<Etat>("inactif");
  const busy = etatExport === "en_cours" || etatSuppression === "en_cours";
  const supprime = etatSuppression === "termine";

  async function telecharger() {
    setEtatExport("en_cours");
    try {
      const donnees = await exporter({ data: undefined as never });
      const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crea-expert-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setEtatExport("termine");
      toast.success("Votre export a été téléchargé.");
    } catch {
      setEtatExport("erreur");
      toast.error("L'export n'a pas pu être généré. Réessayez dans quelques instants.");
    }
  }

  async function confirmerSuppression() {
    setEtatSuppression("en_cours");
    try {
      await supprimer({ data: undefined as never });
      setEtatSuppression("termine");
      await supabase.auth.signOut();
      toast.success("Votre demande de suppression a été prise en compte.");
      setTimeout(() => navigate({ to: "/", replace: true }), 6000);
    } catch {
      setEtatSuppression("erreur");
      toast.error("La suppression n'a pas pu être menée à son terme. Contactez-nous.");
    }
  }

  return (
    <PageShell>
      <div className="container-page max-w-3xl py-12">
        <h1 className="font-serif text-3xl">Mon compte</h1>

        <section className="mt-8 space-y-4 rounded-lg border border-border bg-surface p-6">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-5 text-accent" strokeWidth={1.5} aria-hidden />
            <h2 className="font-serif text-2xl">Mes données personnelles</h2>
          </div>

          {supprime ? (
            <div className="space-y-3 rounded-md border border-border bg-muted/60 p-4 text-sm leading-relaxed">
              <p className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4 text-accent" strokeWidth={1.5} aria-hidden />
                Suppression terminée
              </p>
              <p>
                Votre compte, vos dossiers et vos pièces justificatives ont été supprimés, y compris
                les fichiers déposés dans notre espace de stockage privé.
              </p>
              <div>
                <p className="font-medium">
                  Données conservées 10 ans au titre de l'obligation légale de conservation
                  comptable (art. L. 123-22 du code de commerce), sous une forme dissociée de votre
                  identité :
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {DONNEES_CONSERVEES.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                <p className="mt-2">
                  Ces éléments ne comportent ni nom, ni adresse électronique, ni téléphone, ni pièce
                  justificative. Vous allez être redirigé vers l'accueil.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Exporter mes données</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Téléchargez, au format JSON, les données rattachées à votre compte : profil,
                  dossiers, associés, métadonnées des pièces déposées et journal de votre dossier.
                  Les identifiants techniques de notre prestataire de paiement en sont exclus.
                </p>
                <Button variant="outline" onClick={telecharger} disabled={busy}>
                  <Download strokeWidth={1.5} />
                  {etatExport === "en_cours" ? "Préparation…" : "Exporter mes données"}
                </Button>
                <Statut
                  etat={etatExport}
                  libelles={{
                    en_cours: "Export en cours…",
                    termine: "Export terminé : le fichier a été téléchargé.",
                    erreur: "Erreur : l'export n'a pas pu être généré.",
                  }}
                />
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <h3 className="text-sm font-medium">Supprimer mon compte</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  La suppression efface votre compte, vos dossiers et les fichiers déposés dans notre
                  espace de stockage privé.
                </p>
                <div className="rounded-md border border-border bg-muted/40 p-3 text-sm leading-relaxed">
                  <p className="font-medium">Ce qui reste conservé, et pourquoi</p>
                  <p className="mt-1 text-muted-foreground">
                    L'obligation légale de conservation comptable (10 ans) impose de garder une trace
                    minimale, dissociée de votre identité :
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                    {DONNEES_CONSERVEES.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={busy}>
                      <Trash2 strokeWidth={1.5} />
                      Supprimer mon compte
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cette action est irréversible</AlertDialogTitle>
                      <AlertDialogDescription>
                        Votre compte, vos dossiers et vos pièces justificatives seront définitivement
                        supprimés. Seules les données de facturation soumises à conservation légale
                        seront conservées, de façon dissociée. Confirmez-vous la suppression ?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={confirmerSuppression}>
                        {etatSuppression === "en_cours" ? "Suppression…" : "Supprimer définitivement"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Statut
                  etat={etatSuppression}
                  libelles={{
                    en_cours: "Suppression en cours…",
                    termine: "Suppression terminée.",
                    erreur:
                      "Erreur : la suppression n'a pas pu être menée à son terme. Aucune donnée n'a été perdue ; réessayez ou contactez-nous.",
                  }}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </PageShell>
  );
}

