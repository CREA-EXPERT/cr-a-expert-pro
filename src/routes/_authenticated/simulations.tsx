import React, { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QUESTIONS, SIMULATEUR_TEXTES_VERSION } from "@/lib/simulateur-textes";
import { horodatageFr } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/simulations")({
  head: () => ({
    meta: [
      { title: "Comparatifs réalisés — CREA EXPERT" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Consultation administrative des comparatifs de formes juridiques réalisés : version des textes, réponses et état d'envoi.",
      },
      { property: "og:title", content: "Comparatifs réalisés — CREA EXPERT" },
      {
        property: "og:description",
        content: "Suivi administratif des simulations du comparateur de formes juridiques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminSimulations,
  errorComponent: ({ error }) => (
    <PageShell>
      <div className="container-page py-14" role="alert">
        Une erreur est survenue : {error.message}
      </div>
    </PageShell>
  ),
});

type JournalSimu = {
  version_textes?: string;
  horodatage?: string;
  forme_retenue?: string;
  empreinte_restitution?: string;
  enregistre_le?: string;
};

type LigneSimu = {
  id: string;
  created_at: string;
  email: string;
  prenom: string | null;
  resultat: string | null;
  email_envoye_le: string | null;
  email_erreur: string | null;
  reponses: unknown;
};

function extraire(ligne: LigneSimu) {
  const brut = (ligne.reponses ?? {}) as Record<string, unknown>;
  const reponses = (brut["reponses"] ?? {}) as Record<string, string>;
  const journal = (brut["journal"] ?? {}) as JournalSimu;
  return { reponses, journal };
}

function libelleQuestion(id: string) {
  return QUESTIONS.find((q) => q.id === id)?.intitule ?? id;
}

function libelleReponse(id: string, valeur: string) {
  const q = QUESTIONS.find((x) => x.id === id);
  return q?.options.find((o) => o.v === valeur)?.l ?? valeur;
}

function champCsv(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

function AdminSimulations() {
  const { user } = useAuth();
  const { isAdmin, isCabinet, loading } = useRoles(user);
  const [recherche, setRecherche] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);

  const autorise = isAdmin || isCabinet;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-simulations"],
    enabled: autorise,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("simulations")
        .select("id, created_at, email, prenom, resultat, email_envoye_le, email_erreur, reponses")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (rows ?? []) as LigneSimu[];
    },
  });

  const lignes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const toutes = data ?? [];
    if (!q) return toutes;
    return toutes.filter((l) =>
      [l.email, l.prenom ?? "", l.resultat ?? "", extraire(l).journal.version_textes ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [data, recherche]);

  function exporterCsv() {
    const idsQuestions = QUESTIONS.map((q) => q.id);
    const entetes = [
      "Date",
      "Email",
      "Prénom",
      "Résultat",
      "Version des textes",
      "Empreinte restitution",
      "Journal présent",
      "Email envoyé le",
      "Erreur d'envoi",
      ...idsQuestions.map((id) => libelleQuestion(id)),
    ];
    const corps = lignes.map((l) => {
      const { reponses, journal } = extraire(l);
      return [
        horodatageFr(l.created_at),
        l.email,
        l.prenom ?? "",
        l.resultat ?? "",
        journal.version_textes ?? "",
        journal.empreinte_restitution ?? "",
        journal.version_textes ? "oui" : "non",
        l.email_envoye_le ? horodatageFr(l.email_envoye_le) : "",
        l.email_erreur ?? "",
        ...idsQuestions.map((id) => (reponses[id] ? libelleReponse(id, reponses[id]) : "")),
      ]
        .map(champCsv)
        .join(";");
    });
    const csv = `\uFEFF${[entetes.map(champCsv).join(";"), ...corps].join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparatifs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <PageShell>
        <div className="container-page py-14 text-muted-foreground">Chargement…</div>
      </PageShell>
    );
  }

  if (!autorise) {
    return (
      <PageShell>
        <div className="container-page max-w-xl py-14">
          <h1 className="font-serif text-3xl">Accès réservé</h1>
          <p className="mt-3 text-muted-foreground">
            Cet espace est réservé au cabinet et aux administrateurs.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/tableau-de-bord">Retour à mon espace</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container-page max-w-6xl py-10">
        <h1 className="font-serif text-3xl">Comparatifs réalisés</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground text-justify">
          Chaque ligne correspond à un comparatif de formes juridiques servi à un visiteur : version
          des textes appliquée, réponses déclarées, empreinte de la restitution et état de l'envoi
          par email. Version des textes actuellement en production : v{SIMULATEUR_TEXTES_VERSION}.
        </p>

        <div className="mt-6 flex flex-wrap items-end gap-3">
          <div className="w-full max-w-sm space-y-2">
            <Label htmlFor="rech-simu">Rechercher</Label>
            <Input
              id="rech-simu"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Adresse, prénom, résultat, version…"
            />
          </div>
          <Button variant="outline" onClick={exporterCsv} disabled={lignes.length === 0}>
            Exporter en CSV
          </Button>
        </div>

        {isLoading ? (
          <p className="mt-8 text-muted-foreground">Chargement des comparatifs…</p>
        ) : lignes.length === 0 ? (
          <p className="mt-8 text-muted-foreground">Aucun comparatif à afficher.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <caption className="sr-only">Liste des comparatifs réalisés</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="p-3 font-medium">Date</th>
                  <th scope="col" className="p-3 font-medium">Contact</th>
                  <th scope="col" className="p-3 font-medium">Résultat</th>
                  <th scope="col" className="p-3 font-medium">Textes</th>
                  <th scope="col" className="p-3 font-medium">Journal</th>
                  <th scope="col" className="p-3 font-medium">Email</th>
                  <th scope="col" className="p-3 font-medium">Réponses</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => {
                  const { reponses, journal } = extraire(l);
                  const estOuvert = ouvert === l.id;
                  return (
                    <React.Fragment key={l.id}>
                      <tr className="border-b border-border align-top">
                        <td className="p-3 whitespace-nowrap">{horodatageFr(l.created_at)}</td>
                        <td className="p-3">
                          <span className="block">{l.email}</span>
                          {l.prenom && (
                            <span className="block text-xs text-muted-foreground">{l.prenom}</span>
                          )}
                        </td>
                        <td className="p-3">{l.resultat ?? "—"}</td>
                        <td className="p-3 whitespace-nowrap">
                          {journal.version_textes ? `v${journal.version_textes}` : "—"}
                        </td>
                        <td className="p-3">
                          {journal.empreinte_restitution ? (
                            <Badge variant="secondary">
                              empreinte {journal.empreinte_restitution}
                            </Badge>
                          ) : (
                            <Badge variant="outline">absent</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          {l.email_erreur ? (
                            <Badge variant="destructive">échec</Badge>
                          ) : l.email_envoye_le ? (
                            <span className="text-xs">{horodatageFr(l.email_envoye_le)}</span>
                          ) : (
                            <Badge variant="outline">en attente</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-expanded={estOuvert}
                            aria-controls={`rep-${l.id}`}
                            onClick={() => setOuvert(estOuvert ? null : l.id)}
                          >
                            {estOuvert ? "Masquer" : `Voir (${Object.keys(reponses).length})`}
                          </Button>
                        </td>
                      </tr>
                      {estOuvert && (
                        <tr className="border-b border-border bg-muted/40">
                          <td colSpan={7} className="p-4" id={`rep-${l.id}`}>
                            <dl className="grid gap-3 md:grid-cols-2">
                              {Object.entries(reponses).map(([id, v]) => (
                                <div key={id}>
                                  <dt className="text-xs text-muted-foreground">
                                    {libelleQuestion(id)}
                                  </dt>
                                  <dd className="text-sm">{libelleReponse(id, v)}</dd>
                                </div>
                              ))}
                            </dl>
                            {l.email_erreur && (
                              <p className="mt-3 text-xs text-destructive">
                                Erreur d'envoi : {l.email_erreur}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
