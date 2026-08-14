import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LIBELLE_CATEGORIE_REJET } from "@/lib/qualite";

type Motif = { categorie: string; motif_texte: string; date_rejet: string };

/**
 * Statistiques de qualité documentaire : répartition des motifs de rejet et
 * volume de relances. Aucune donnée personnelle n'est affichée.
 */
export function PanneauQualite() {
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [relances, setRelances] = useState(0);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from("motifs_rejet_greffe")
          .select("categorie, motif_texte, date_rejet")
          .order("date_rejet", { ascending: false })
          .limit(500),
        supabase.from("relances_pieces").select("id", { count: "exact", head: true }),
      ]);
      setMotifs(data ?? []);
      setRelances(count ?? 0);
      setChargement(false);
    })();
  }, []);

  const parCategorie = useMemo(() => {
    const carte = new Map<string, number>();
    for (const m of motifs) carte.set(m.categorie, (carte.get(m.categorie) ?? 0) + 1);
    return [...carte.entries()].sort((a, b) => b[1] - a[1]);
  }, [motifs]);

  const total = motifs.length;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-serif text-xl">Qualité et rejets</h2>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Répartition des motifs de non-conformité relevés lors de la revue des pièces. Ces
          statistiques servent à améliorer les consignes affichées aux clients.
        </p>
      </div>

      {chargement ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Carte titre="Motifs enregistrés" valeur={String(total)} />
            <Carte titre="Relances envoyées" valeur={String(relances)} />
            <Carte
              titre="Motif le plus fréquent"
              valeur={
                parCategorie[0]
                  ? (LIBELLE_CATEGORIE_REJET[parCategorie[0][0]] ?? parCategorie[0][0])
                  : "—"
              }
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-surface p-5">
            <h3 className="text-sm font-medium">Répartition par catégorie</h3>
            {parCategorie.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun motif enregistré à ce jour.</p>
            )}
            <ul className="space-y-2">
              {parCategorie.map(([cle, n]) => (
                <li key={cle}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{LIBELLE_CATEGORIE_REJET[cle] ?? cle}</span>
                    <span className="text-muted-foreground">
                      {n} ({Math.round((n / Math.max(total, 1)) * 100)} %)
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{ width: `${Math.round((n / Math.max(total, 1)) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-sm font-medium">Derniers motifs</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {motifs.slice(0, 10).map((m, i) => (
                <li key={i}>
                  — {LIBELLE_CATEGORIE_REJET[m.categorie] ?? m.categorie}
                  {m.motif_texte ? ` : ${m.motif_texte}` : ""}
                </li>
              ))}
              {motifs.length === 0 && <li>Aucun motif enregistré.</li>}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

function Carte({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-sm text-muted-foreground">{titre}</p>
      <p className="mt-1 font-serif text-2xl">{valeur}</p>
    </div>
  );
}
