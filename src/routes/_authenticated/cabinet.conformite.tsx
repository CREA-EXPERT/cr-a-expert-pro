import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  lignesConformite,
  TYPE_REUSSIE,
  TYPES_CONFORMITE,
  telechargerJournal,
  type LigneConformite,
} from "@/lib/conformite";
import { libelleVersion } from "@/lib/gabarits";
import { horodatageFr, type EvenementJournal } from "@/lib/journal";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cabinet/conformite")({
  head: () => ({
    meta: [
      { title: "Suivi de conformité — CREA EXPERT" },
      {
        name: "description",
        content:
          "Suivi opérationnel des refus de génération des statuts et du temps écoulé avant validation des dossiers.",
      },
      { property: "og:title", content: "Suivi de conformité — CREA EXPERT" },
      {
        property: "og:description",
        content: "Refus de génération et délais de validation, dossier par dossier.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuiviConformite,
});

type Ligne = {
  id: string;
  denomination: string;
  forme: string;
  refus: number;
  reussites: number;
  motifs: string[];
  dernier: string | null;
  premierEssai: string | null;
  valideLe: string | null;
  delaiHeures: number | null;
  journal: LigneConformite[];
};

function heures(depuis: string, jusqu: string) {
  return (new Date(jusqu).getTime() - new Date(depuis).getTime()) / 3_600_000;
}

function dureeFr(h: number) {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${Math.round(h / 24)} j`;
}

function SuiviConformite() {
  const { user } = useAuth();
  const { isCabinet, loading } = useRoles(user);

  const { data, isLoading } = useQuery({
    queryKey: ["cabinet-conformite"],
    enabled: isCabinet,
    queryFn: async (): Promise<Ligne[]> => {
      const { data: dossiers, error } = await supabase
        .from("dossiers")
        .select("id, denomination, forme_juridique, created_at, valide_le, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const ids = (dossiers ?? []).map((d) => d.id);
      const { data: events } = ids.length
        ? await supabase
            .from("events_dossier")
            .select("dossier_id, type_event, message, created_at")
            .in("dossier_id", ids)
            .in("type_event", TYPES_CONFORMITE)
            .order("created_at", { ascending: false })
        : { data: [] as (EvenementJournal & { dossier_id: string })[] };

      return (dossiers ?? []).map((d) => {
        const propres = (events ?? []).filter((e) => e.dossier_id === d.id);
        const journal = lignesConformite(propres as EvenementJournal[]);
        const refus = journal.filter((l) => !l.conforme);
        const dates = propres.map((e) => e.created_at).sort();
        const premierEssai = dates[0] ?? null;
        const fin = d.valide_le ?? null;
        return {
          id: d.id,
          denomination: d.denomination || "Dossier sans nom",
          forme: d.forme_juridique ?? "",
          refus: refus.length,
          reussites: propres.filter((e) => e.type_event === TYPE_REUSSIE).length,
          motifs: [...new Set(refus.flatMap((l) => l.motifs))],
          dernier: dates[dates.length - 1] ?? null,
          premierEssai,
          valideLe: fin,
          delaiHeures: premierEssai && fin ? heures(premierEssai, fin) : null,
          journal,
        };
      });
    },
  });

  if (loading) {
    return (
      <PageShell>
        <div className="container-page py-14 text-muted-foreground">Chargement…</div>
      </PageShell>
    );
  }

  if (!isCabinet) {
    return (
      <PageShell>
        <div className="container-page py-14">
          <p className="text-sm text-muted-foreground">
            Cet espace est réservé au cabinet et à l'administration.
          </p>
        </div>
      </PageShell>
    );
  }

  const lignes = data ?? [];
  const avecRefus = lignes.filter((l) => l.refus > 0);
  const delais = lignes.map((l) => l.delaiHeures).filter((h): h is number => h !== null);
  const delaiMoyen = delais.length ? delais.reduce((a, b) => a + b, 0) / delais.length : null;
  const motifsFrequents = [...avecRefus.flatMap((l) => l.motifs)].reduce<Record<string, number>>(
    (acc, m) => ({ ...acc, [m]: (acc[m] ?? 0) + 1 }),
    {},
  );
  const classement = Object.entries(motifsFrequents)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <PageShell>
      <div className="container-page space-y-10 py-14">
        <header className="space-y-3">
          <h1 className="font-serif text-3xl">Suivi de conformité</h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground text-justify">
            Refus de génération des projets de statuts et temps écoulé entre la première tentative
            et la validation du dossier. Règles appliquées : {libelleVersion(null)}.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Dossiers suivis", valeur: String(lignes.length) },
            { label: "Dossiers avec au moins un refus", valeur: String(avecRefus.length) },
            {
              label: "Délai moyen avant validation",
              valeur: delaiMoyen === null ? "—" : dureeFr(delaiMoyen),
            },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-surface p-5">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="mt-2 font-serif text-2xl">{c.valeur}</p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-xl">Motifs de refus les plus fréquents</h2>
          {classement.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun refus enregistré.</p>
          ) : (
            <ul className="space-y-2">
              {classement.map(([motif, nb]) => (
                <li
                  key={motif}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-4"
                >
                  <span className="text-sm text-justify">{motif}</span>
                  <Badge variant="outline">
                    {nb} dossier{nb > 1 ? "s" : ""}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-xl">Dossiers</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des dossiers…</p>
          ) : lignes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun dossier à afficher.</p>
          ) : (
            <ul className="space-y-3">
              {lignes.map((l) => (
                <li
                  key={l.id}
                  className="space-y-3 rounded-lg border border-border bg-surface p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{l.denomination}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.forme} · dernière tentative :{" "}
                        {l.dernier ? horodatageFr(l.dernier) : "aucune"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={l.refus > 0 ? "outline" : "secondary"}>
                        {l.refus} refus
                      </Badge>
                      <Badge variant="secondary">{l.reussites} générés</Badge>
                      <Badge variant="outline">
                        {l.delaiHeures === null
                          ? "Validation en attente"
                          : `Validé en ${dureeFr(l.delaiHeures)}`}
                      </Badge>
                    </div>
                  </div>
                  {l.motifs.length > 0 && (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {l.motifs.slice(0, 4).map((m, i) => (
                        <li key={i} className="text-justify">
                          {m}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/cabinet/$id" params={{ id: l.id }}>
                        Ouvrir le dossier
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={l.journal.length === 0}
                      onClick={() => telechargerJournal(l.denomination, l.journal)}
                    >
                      <Download aria-hidden strokeWidth={1.5} />
                      Journal
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
