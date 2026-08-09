import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
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

function MonCompte() {
  const navigate = useNavigate();
  const exporter = useServerFn(exporterMesDonnees);
  const supprimer = useServerFn(supprimerMonCompte);
  const [busy, setBusy] = useState<"export" | "suppression" | null>(null);
  const [supprime, setSupprime] = useState(false);

  async function telecharger() {
    setBusy("export");
    try {
      const donnees = await exporter({ data: undefined as never });
      const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crea-expert-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Votre export a été téléchargé.");
    } catch {
      toast.error("L'export n'a pas pu être généré. Réessayez dans quelques instants.");
    } finally {
      setBusy(null);
    }
  }

  async function confirmerSuppression() {
    setBusy("suppression");
    try {
      await supprimer({ data: undefined as never });
      setSupprime(true);
      await supabase.auth.signOut();
      toast.success("Votre demande de suppression a été prise en compte.");
      setTimeout(() => navigate({ to: "/", replace: true }), 4000);
    } catch {
      toast.error("La suppression n'a pas pu être menée à son terme. Contactez-nous.");
    } finally {
      setBusy(null);
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
            <p className="rounded-md border border-border bg-muted/60 p-4 text-sm leading-relaxed">
              Votre demande de suppression a été prise en compte. Votre compte, vos dossiers et vos
              pièces justificatives ont été supprimés. Les données de facturation soumises à
              conservation légale (10 ans) sont conservées de façon dissociée et minimisée, sans
              élément permettant de vous identifier.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Exporter mes données</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Téléchargez, au format JSON, les données rattachées à votre compte : profil,
                  dossiers, associés, métadonnées des pièces déposées et journal de votre dossier.
                </p>
                <Button variant="outline" onClick={telecharger} disabled={busy !== null}>
                  <Download strokeWidth={1.5} />
                  {busy === "export" ? "Préparation…" : "Exporter mes données"}
                </Button>
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <h3 className="text-sm font-medium">Supprimer mon compte</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  La suppression efface votre compte, vos dossiers et les fichiers déposés dans notre
                  espace de stockage privé. Les données de facturation soumises à une obligation
                  légale de conservation (10 ans) ne sont pas supprimées : elles sont conservées de
                  façon dissociée et minimisée.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={busy !== null}>
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
                        {busy === "suppression" ? "Suppression…" : "Supprimer définitivement"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </section>
      </div>
    </PageShell>
  );
}
