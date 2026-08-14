import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  etatRevue,
  LIBELLE_REVUE,
  LIBELLE_RISQUE,
  type EtatRevue,
} from "@/lib/denomination-journal";
import { termesReglementesDetectes, type NiveauRisqueDenomination } from "@/lib/denomination";
import { horodatageFr } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/cabinet/denominations")({
  head: () => ({
    meta: [
      { title: "Suivi des dénominations — CREA EXPERT" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Regroupement des dossiers par niveau de risque de dénomination et termes réglementés détectés.",
      },
      { property: "og:title", content: "Suivi des dénominations — CREA EXPERT" },
      {
        property: "og:description",
        content: "Vue cabinet des risques de dénomination et des revues à mener.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuiviDenominations,
});

const ORDRE: NiveauRisqueDenomination[] = ["proche", "eloigne", "aucun"];

type LigneDossier = {
  id: string;
  denomination: string;
  risque: NiveauRisqueDenomination;
  termes: string[];
  revue: EtatRevue;
  maj: string;
};

function normaliser(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function SuiviDenominations() {
  const { user } = useAuth();
  const { isCabinet, loading } = useRoles(user);
  const [recherche, setRecherche] = useState("");
  const [revue, setRevue] = useState("toutes");

  const { data, isLoading } = useQuery({
    queryKey: ["cabinet-denominations"],
    enabled: isCabinet,
    queryFn: async (): Promise<LigneDossier[]> => {
      const { data: dossiers, error } = await supabase
        .from("dossiers")
        .select("id, denomination, denomination_risque, updated_at")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (dossiers ?? []).map((d) => {
        const risque = (d.denomination_risque ?? "aucun") as NiveauRisqueDenomination;
        const termes = termesReglementesDetectes(d.denomination ?? "");
        return {
          id: d.id,
          denomination: d.denomination ?? "",
          risque: ORDRE.includes(risque) ? risque : "aucun",
          termes,
          revue: etatRevue(risque, termes),
          maj: d.updated_at,
        };
      });
    },
  });

  const lignes = useMemo(() => {
    const q = normaliser(recherche.trim());
    return (data ?? []).filter((l) => {
      if (revue !== "toutes" && l.revue !== revue) return false;
      if (q === "") return true;
      return normaliser(`${l.denomination} ${l.termes.join(" ")}`).includes(q);
    });
  }, [data, recherche, revue]);

  if (loading) return null;
  if (!isCabinet)
    return (
      <PageShell>
        <p className="text-sm">Cet espace est réservé au cabinet.</p>
      </PageShell>
    );

  return (
    <PageShell>
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="font-serif text-3xl">Suivi des dénominations</h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            Information de risque uniquement : une homonymie n'empêche jamais l'immatriculation.
            Cette vue sert à prioriser les revues du cabinet.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="rech-dossier">Rechercher</Label>
            <Input
              id="rech-dossier"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Dénomination ou terme réglementé"
            />
          </div>
          <div className="space-y-1">
            <Label>Revue cabinet</Label>
            <Select value={revue} onValueChange={setRevue}>
              <SelectTrigger aria-label="Revue cabinet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Tous les états</SelectItem>
                <SelectItem value="systematique">{LIBELLE_REVUE.systematique}</SelectItem>
                <SelectItem value="recommandee">{LIBELLE_REVUE.recommandee}</SelectItem>
                <SelectItem value="aucune">{LIBELLE_REVUE.aucune}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

        {!isLoading &&
          ORDRE.map((niveau) => {
            const lot = lignes.filter((l) => l.risque === niveau);
            return (
              <section key={niveau} className="space-y-3" data-testid={`groupe-${niveau}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-xl">{LIBELLE_RISQUE[niveau]}</h2>
                  <Badge variant={niveau === "proche" ? "default" : "secondary"}>
                    {lot.length} dossier{lot.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                {lot.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun dossier dans ce groupe.</p>
                ) : (
                  <ul className="space-y-2">
                    {lot.map((l) => (
                      <li
                        key={l.id}
                        className="rounded-lg border border-border bg-surface p-4 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">{l.denomination || "—"}</p>
                          <Link
                            to="/cabinet/$id"
                            params={{ id: l.id }}
                            className="text-sm underline underline-offset-4"
                          >
                            Ouvrir l'historique du dossier
                          </Link>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{LIBELLE_REVUE[l.revue]}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {l.termes.length > 0
                              ? `Termes réglementés : ${l.termes.join(", ")}`
                              : "Aucun terme réglementé détecté"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            — mis à jour le {horodatageFr(l.maj)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
      </div>
    </PageShell>
  );
}
