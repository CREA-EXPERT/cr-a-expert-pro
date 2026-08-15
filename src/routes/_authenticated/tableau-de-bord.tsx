import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConsultationExpertCard } from "@/components/ConsultationExpertCard";
import { PROCHAINE_ACTION, STATUTS, STATUT_LABEL } from "@/lib/domain";
import { CheckCircle2, Circle, CreditCard, FileSignature } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — CREA EXPERT" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Suivez l'avancement de votre dossier de création de société." },
      { property: "og:title", content: "Tableau de bord — CREA EXPERT" },
      { property: "og:description", content: "L'avancement de votre dossier de création." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["mon-dossier"],
    queryFn: async () => {
      const { data: dossiers } = await supabase
        .from("dossiers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);
      const dossier = dossiers?.[0] ?? null;
      if (!dossier) return { dossier: null, events: [] };
      const { data: events } = await supabase
        .from("events_dossier")
        .select("*")
        .eq("dossier_id", dossier.id)
        .order("created_at", { ascending: false });
      return { dossier, events: events ?? [] };
    },
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="container-page py-14 text-muted-foreground">Chargement…</div>
      </PageShell>
    );
  }

  const dossier = data?.dossier;

  if (!dossier) {
    return (
      <PageShell>
        <div className="container-page max-w-2xl py-14">
          <h1 className="font-serif text-3xl">Bienvenue</h1>
          <p className="mt-3 text-base">
            Vous n'avez pas encore de dossier. Commencez votre parcours de création : il est
            sauvegardé automatiquement à chaque étape.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/creation">Commencer mon dossier</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const indexStatut = STATUTS.indexOf(dossier.statut as (typeof STATUTS)[number]);

  return (
    <PageShell>
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-3xl">{dossier.denomination || "Dossier en cours"}</h1>
              <Badge variant="secondary">{dossier.forme_juridique}</Badge>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Statut</p>
            <p className="text-lg font-semibold">{STATUT_LABEL[dossier.statut] ?? dossier.statut}</p>

            <div className="mt-4 rounded-md border border-accent/40 bg-accent/8 p-4">
              <p className="text-sm font-medium">Prochaine action attendue</p>
              <p className="mt-1 text-base">{PROCHAINE_ACTION[dossier.statut]}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/creation">Reprendre mon dossier</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/documents">Mes documents</Link>
              </Button>
              <ConsultationExpertCard variante="inline" />
            </div>

            <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
              <Button variant="secondary" disabled>
                <CreditCard strokeWidth={1.5} /> Payer les frais légaux — Bientôt disponible
              </Button>
              <Button variant="secondary" disabled>
                <FileSignature strokeWidth={1.5} /> Signer mes documents — Bientôt disponible
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="font-serif text-xl">Étapes du dossier</h2>
            <ol className="mt-4 space-y-3">
              {STATUTS.map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-sm">
                  {i <= indexStatut ? (
                    <CheckCircle2 className="size-4 text-success" strokeWidth={1.5} aria-hidden />
                  ) : (
                    <Circle className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden />
                  )}
                  <span className={i <= indexStatut ? "font-medium" : "text-muted-foreground"}>
                    {STATUT_LABEL[s]}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-surface p-6">
          <h2 className="font-serif text-xl">Historique</h2>
          {(data?.events ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Aucun événement pour le moment.</p>
          ) : (
            <ol className="mt-4 space-y-4 border-l border-border pl-4">
              {data?.events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-accent" aria-hidden />
                  <p className="text-sm">{e.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("fr-FR")}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </PageShell>
  );
}
