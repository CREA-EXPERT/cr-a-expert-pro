import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUTS, STATUT_LABEL } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/cabinet/")({
  head: () => ({
    meta: [
      { title: "Espace cabinet — CREA EXPERT" },
      { name: "description", content: "Liste des dossiers de création à revoir par le cabinet d'expertise comptable." },
      { property: "og:title", content: "Espace cabinet — CREA EXPERT" },
      { property: "og:description", content: "Suivi et revue des dossiers clients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CabinetListe,
});

function CabinetListe() {
  const { user } = useAuth();
  const { isCabinet, loading: rolesLoading } = useRoles(user);
  const [statut, setStatut] = useState<string>("tous");
  const [recherche, setRecherche] = useState("");

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
      const { count } = await supabase
        .from("callbacks")
        .select("id", { count: "exact", head: true })
        .eq("statut", "a_traiter");
      return { dossiers: dossiers ?? [], docs: docs ?? [], rappels: count ?? 0 };
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

  const compte = (id: string, s: string) =>
    (data?.docs ?? []).filter((d) => d.dossier_id === id && d.statut_document === s).length;

  const q = recherche.trim().toLowerCase();
  const dossiers = (data?.dossiers ?? []).filter((d) => {
    const okStatut = statut === "tous" || d.statut === statut;
    const okRecherche =
      q === "" ||
      (d.denomination ?? "").toLowerCase().includes(q) ||
      (d.sigle ?? "").toLowerCase().includes(q) ||
      d.forme_juridique.toLowerCase().includes(q) ||
      d.id.toLowerCase().startsWith(q);
    return okStatut && okRecherche;
  });

  return (
    <PageShell>
      <div className="container-page py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl">Dossiers clients</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {dossiers.length} dossier(s) affiché(s) sur {data?.dossiers.length ?? 0}. Les dossiers signalés
              « accompagnement requis » sont à traiter en priorité.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/cabinet/conformite">Suivi de conformité</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/cabinet/rappels">
                Demandes de rappel{data?.rappels ? ` (${data.rappels})` : ""}
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_16rem]">
          <div className="space-y-1.5">
            <Label htmlFor="recherche">Rechercher</Label>
            <Input
              id="recherche"
              placeholder="Dénomination, sigle, forme juridique…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-statut">Statut</Label>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger id="filtre-statut">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                {STATUTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUT_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-8 text-muted-foreground">Chargement…</p>
        ) : dossiers.length === 0 ? (
          <p className="mt-8 text-muted-foreground">Aucun dossier ne correspond à votre recherche.</p>
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
                {dossiers.map((d) => (
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
