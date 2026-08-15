import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  listerDossiersDeTest,
  purgerTousDossiersTest,
  purgerUnDossierTest,
} from "@/lib/purge-test.functions";
import { BADGE_TEST, MOTIF_EMAIL_TEST } from "@/lib/test-mode";

export const Route = createFileRoute("/_authenticated/cabinet/donnees-test")({
  head: () => ({
    meta: [
      { title: "Données de test — CREA EXPERT" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Inventaire et purge des dossiers de test créés pour les recettes de bout en bout.",
      },
      { property: "og:title", content: "Données de test — CREA EXPERT" },
      { property: "og:description", content: "Purge des dossiers de test." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DonneesTest,
});

function DonneesTest() {
  const { user } = useAuth();
  const { isAdmin, loading } = useRoles(user);
  const lister = useServerFn(listerDossiersDeTest);
  const purgerUn = useServerFn(purgerUnDossierTest);
  const purgerTout = useServerFn(purgerTousDossiersTest);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["dossiers-test"],
    enabled: isAdmin,
    queryFn: () => lister({ data: undefined }),
  });

  async function purgerDossier(id: string) {
    setBusy(true);
    try {
      const r = await purgerUn({ data: { dossierId: id } });
      toast.success(`Dossier de test purgé — ${r.fichiersSupprimes} fichier(s) supprimé(s).`);
      await refetch();
    } catch {
      toast.error("La purge de ce dossier de test a échoué.");
    }
    setBusy(false);
  }

  async function purgerTousLesDossiers() {
    setBusy(true);
    try {
      const r = await purgerTout({ data: { confirmation: "TEST" as const } });
      toast.success(`${r.dossiers} dossier(s) de test purgé(s), ${r.fichiers} fichier(s) supprimé(s).`);
      setConfirmation("");
      await refetch();
    } catch {
      toast.error("La purge globale a échoué.");
    }
    setBusy(false);
  }

  if (loading) {
    return (
      <PageShell>
        <div className="container-page py-14 text-muted-foreground">Chargement…</div>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <div className="container-page max-w-xl py-14">
          <h1 className="font-serif text-3xl">Accès réservé</h1>
          <p className="mt-3 text-base text-muted-foreground">
            La gestion des données de test est réservée à l'administrateur.
          </p>
          <Button asChild className="mt-6">
            <Link to="/tableau-de-bord">Retour à mon espace</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const dossiers = data ?? [];

  return (
    <PageShell>
      <div className="container-page max-w-4xl space-y-8 py-10">
        <header>
          <h1 className="font-serif text-3xl">Données de test</h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            Tout compte dont l'adresse contient «&nbsp;{MOTIF_EMAIL_TEST}&nbsp;» crée des dossiers
            marqués comme dossiers de test : ils sont exclus des statistiques du cabinet et leurs
            emails ne partent que vers l'adresse du compte de test. La purge ci-dessous ne touche
            jamais aux dossiers réels ni à la conservation réglementaire.
          </p>
        </header>

        {isLoading ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : dossiers.length === 0 ? (
          <p className="text-muted-foreground">Aucun dossier de test enregistré.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {dossiers.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 p-4">
                <Badge variant="secondary">{BADGE_TEST}</Badge>
                <span className="font-medium">{d.denomination || "Sans dénomination"}</span>
                <span className="text-sm text-muted-foreground">{d.forme_juridique}</span>
                <span className="text-sm text-muted-foreground">{d.statut}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString("fr-FR")}
                </span>
                <Button
                  className="ml-auto"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => purgerDossier(d.id)}
                >
                  Purger ce dossier de test
                </Button>
              </li>
            ))}
          </ul>
        )}

        <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-5">
          <h2 className="mt-0 font-serif text-xl">Purger tous les dossiers de test</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Saisissez TEST pour confirmer. Les fichiers stockés, signatures, traces, journaux et
            demandes de contact rattachés à ces dossiers sont supprimés.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="confirmation-purge">Confirmation</Label>
              <Input
                id="confirmation-purge"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="TEST"
                className="w-40"
              />
            </div>
            <Button
              variant="destructive"
              disabled={confirmation !== "TEST" || busy || dossiers.length === 0}
              onClick={purgerTousLesDossiers}
            >
              Purger tous les dossiers de test
            </Button>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
