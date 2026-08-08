import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUT_LABEL } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/cabinet/")({
  head: () => ({
    meta: [
      { title: "Espace cabinet — CREA EXPERT" },
      { name: "description", content: "Liste des dossiers de création à revoir par le cabinet d'expertise comptable." },
      { property: "og:title", content: "Espace cabinet — CREA EXPERT" },
      { property: "og:description", content: "Suivi et revue des dossiers clients." },
    ],
  }),
  component: CabinetListe,
});

function CabinetListe() {
  const { user } = useAuth();
  const { isCabinet, loading: rolesLoading } = useRoles(user);

  const { data, isLoading } = useQuery({
    queryKey: ["cabinet-dossiers"],
    enabled: isCabinet,
    queryFn: async () => {
      const { data: dossiers, error } = await supabase
        .from("dossiers")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const ids = (dossiers ?? []).map((d) => d.id);
      const { data: docs } = ids.length
        ? await supabase.from("documents").select("dossier_id, statut_document").in("dossier_id", ids)
        : { data: [] as { dossier_id: string; statut_document: string }[] };
      return { dossiers: dossiers ?? [], docs: docs ?? [] };
    },
  });

  if (rolesLoading) {
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
          <p className="mt-3 text-base text-muted-foreground">
            Cet espace est réservé aux collaborateurs du cabinet partenaire.
          </p>
          <Button asChild className="mt-6">
            <Link to="/tableau-de-bord">Retour à mon espace</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const compte = (id: string, statut: string) =>
    (data?.docs ?? []).filter((d) => d.dossier_id === id && d.statut_document === statut).length;

  return (
    <PageShell>
      <div className="container-page py-10">
        <h1 className="font-serif text-3xl">Dossiers clients</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data?.dossiers.length ?? 0} dossier(s). Les dossiers signalés « accompagnement requis » sont à traiter en priorité.
        </p>

        {isLoading ? (
          <p className="mt-8 text-muted-foreground">Chargement…</p>
        ) : (data?.dossiers.length ?? 0) === 0 ? (
          <p className="mt-8 text-muted-foreground">Aucun dossier pour le moment.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Dénomination</th>
                  <th className="p-3 font-medium">Forme</th>
                  <th className="p-3 font-medium">Statut</th>
                  <th className="p-3 font-medium">Pièces</th>
                  <th className="p-3 font-medium">Mise à jour</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {data?.dossiers.map((d) => (
                  <tr key={d.id} className="border-b border-border/60 last:border-0">
                    <td className="p-3">
                      <span className="font-medium">{d.denomination || "Sans dénomination"}</span>
                      {d.routage_cabinet && (
                        <Badge className="ml-2" variant="default">
                          Accompagnement requis
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">{d.forme_juridique}</td>
                    <td className="p-3">{STATUT_LABEL[d.statut] ?? d.statut}</td>
                    <td className="p-3 whitespace-nowrap">
                      {compte(d.id, "valide")} validée(s) · {compte(d.id, "recu")} à revoir ·{" "}
                      {compte(d.id, "a_fournir")} manquante(s)
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {new Date(d.updated_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="p-3 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/cabinet/$id" params={{ id: d.id }}>
                          Ouvrir
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
