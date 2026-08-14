import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { TableauConformite, dureeFr, type LigneDossier } from "@/components/TableauConformite";
import { lignesConformite, TYPE_REUSSIE, TYPES_CONFORMITE } from "@/lib/conformite";
import { libelleVersion } from "@/lib/gabarits";
import { horodatageFr, type EvenementJournal } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/cabinet/conformite")({
  head: () => ({
    meta: [
      { title: "Suivi de conformité — CREA EXPERT" },
      { name: "robots", content: "noindex, nofollow" },
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

/** Plafond de sécurité sur le volume d'événements chargés. */
const MAX_EVENEMENTS = 3000;

function heures(depuis: string, jusqu: string) {
  return (new Date(jusqu).getTime() - new Date(depuis).getTime()) / 3_600_000;
}

function jourIso(decalageJours = 0) {
  const d = new Date();
  d.setDate(d.getDate() + decalageJours);
  return d.toISOString().slice(0, 10);
}

function SuiviConformite() {
  const { user } = useAuth();
  const { isCabinet, loading } = useRoles(user);
  const [debut, setDebut] = useState(jourIso(-90));
  const [fin, setFin] = useState(jourIso());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["cabinet-conformite", debut, fin],
    enabled: isCabinet,
    queryFn: async (): Promise<LigneDossier[]> => {
      const depuis = new Date(`${debut}T00:00:00`).toISOString();
      const jusqu = new Date(`${fin}T23:59:59`).toISOString();
      const { data: dossiers, error } = await supabase
        .from("dossiers")
        .select("id, denomination, forme_juridique, created_at, valide_le, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const ids = (dossiers ?? []).map((d) => d.id);
      const { data: events, error: erreurEvents } = ids.length
        ? await supabase
            .from("events_dossier")
            .select("dossier_id, type_event, message, created_at")
            .in("dossier_id", ids)
            .in("type_event", TYPES_CONFORMITE)
            .gte("created_at", depuis)
            .lte("created_at", jusqu)
            .order("created_at", { ascending: false })
            .limit(MAX_EVENEMENTS)
        : { data: [] as (EvenementJournal & { dossier_id: string })[], error: null };
      if (erreurEvents) throw erreurEvents;

      return (dossiers ?? []).map((d) => {
        const propres = (events ?? []).filter((e) => e.dossier_id === d.id);
        const journal = lignesConformite(propres as EvenementJournal[]);
        const refus = journal.filter((l) => !l.conforme);
        const dates = propres.map((e) => e.created_at).sort();
        const premierEssai = dates[0] ?? null;
        const finValidation = d.valide_le ?? null;
        return {
          id: d.id,
          denomination: d.denomination || "Dossier sans nom",
          forme: d.forme_juridique ?? "",
          refus: refus.length,
          reussites: propres.filter((e) => e.type_event === TYPE_REUSSIE).length,
          motifs: [...new Set(refus.flatMap((l) => l.motifs))],
          dernier: dates[dates.length - 1] ?? null,
          premierEssai,
          valideLe: finValidation,
          delaiHeures: premierEssai && finValidation ? heures(premierEssai, finValidation) : null,
          journal,
        };
      });
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications-cabinet"],
    enabled: isCabinet,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("notifications_cabinet")
        .select("id, denomination, message, motif_principal, created_at, lu")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return rows ?? [];
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
            et la validation du dossier, sur la période retenue (90 derniers jours par défaut).
            Règles appliquées : {libelleVersion(null)}.
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
          <h2 className="font-serif text-xl">Alertes de conformité</h2>
          {(notifications ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune alerte récente.</p>
          ) : (
            <ul className="space-y-2">
              {(notifications ?? []).map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-surface p-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.denomination || "Dossier sans nom"}</p>
                    <p className="text-sm text-muted-foreground text-justify">
                      {n.motif_principal ?? n.message}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {horodatageFr(n.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-xl">Motifs de refus les plus fréquents</h2>
          {classement.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun refus enregistré sur la période.</p>
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
          <TableauConformite
            lignes={lignes}
            isLoading={isLoading}
            isError={isError}
            onReessayer={() => void refetch()}
            debut={debut}
            fin={fin}
            onPeriode={(d, f) => {
              setDebut(d);
              setFin(f);
            }}
          />
        </section>
      </div>
    </PageShell>
  );
}
