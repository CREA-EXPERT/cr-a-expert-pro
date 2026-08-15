import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/cabinet/rappels")({
  head: () => ({
    meta: [
      { title: "Demandes de rappel — CREA EXPERT" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Suivi des demandes de rappel téléphonique adressées au cabinet partenaire.",
      },
      { property: "og:title", content: "Demandes de rappel — CREA EXPERT" },
      { property: "og:description", content: "Traitement des demandes de rappel des visiteurs et clients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CabinetRappels,
  errorComponent: ({ error }) => (
    <PageShell>
      <div className="container-page py-14" role="alert">
        Une erreur est survenue : {error.message}
      </div>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <div className="container-page py-14">Page introuvable.</div>
    </PageShell>
  ),
});

const STATUT_RAPPEL: Record<string, string> = {
  a_traiter: "À traiter",
  rappele: "Rappelé",
  sans_suite: "Sans suite",
};

function CabinetRappels() {
  const { user } = useAuth();
  const { isCabinet, loading: rolesLoading } = useRoles(user);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["cabinet-callbacks"],
    enabled: isCabinet,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("callbacks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return rows ?? [];
    },
  });

  async function majStatut(id: string, statut: string) {
    const { error } = await supabase.from("callbacks").update({ statut }).eq("id", id);
    if (error) {
      toast.error("Mise à jour impossible.");
      return;
    }
    toast.success("Demande mise à jour.");
    qc.invalidateQueries({ queryKey: ["cabinet-callbacks"] });
  }

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
          <p className="mt-3 text-muted-foreground">
            Cet espace est réservé aux collaborateurs du cabinet partenaire.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/tableau-de-bord">Retour à mon espace</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const rappels = data ?? [];

  return (
    <PageShell>
      <div className="container-page py-10">
        <Link to="/cabinet" className="text-sm text-muted-foreground hover:text-foreground">
          ← Tous les dossiers
        </Link>
        <h1 className="mt-2 font-serif text-3xl">Demandes de rappel</h1>
        <p className="mt-3 rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed">
          Canal remplacé le 15/08/2026 par la consultation payante avec un expert-comptable. Aucune
          nouvelle demande n'arrive ici.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {rappels.filter((r) => r.statut === "a_traiter").length} demande(s) à traiter sur {rappels.length}.
        </p>

        {isLoading ? (
          <p className="mt-8 text-muted-foreground">Chargement…</p>
        ) : rappels.length === 0 ? (
          <p className="mt-8 text-muted-foreground">Aucune demande de rappel pour le moment.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {rappels.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-medium">{r.telephone}</p>
                  <p className="text-sm text-muted-foreground">
                    Créneau souhaité : {r.creneau_souhaite || "non précisé"} ·{" "}
                    {new Date(r.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={r.statut === "a_traiter" ? "default" : "secondary"}>
                    {STATUT_RAPPEL[r.statut] ?? r.statut}
                  </Badge>
                  {r.statut !== "rappele" && (
                    <Button size="sm" onClick={() => majStatut(r.id, "rappele")}>
                      Marquer rappelé
                    </Button>
                  )}
                  {r.statut !== "sans_suite" && (
                    <Button size="sm" variant="outline" onClick={() => majStatut(r.id, "sans_suite")}>
                      Sans suite
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
