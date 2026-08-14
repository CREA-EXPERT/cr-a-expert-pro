import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { horodatageFr } from "@/lib/journal";
import { historiqueConformite, telechargerJournal } from "@/lib/conformite";
import type { Dossier } from "@/lib/documents";
import { Download } from "lucide-react";

/**
 * Historique de conformité d'un dossier : toutes les générations de statuts,
 * abouties ou refusées, horodatées et motivées, avec export du journal.
 */
export function HistoriqueConformite({ dossier }: { dossier: Dossier }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["historique-conformite", dossier.id],
    queryFn: () => historiqueConformite(dossier.id),
  });
  const lignes = data ?? [];
  const [tout, setTout] = useState(false);

  // Le journal s'enrichit pendant la session (aperçu, téléchargements).
  const rafraichir = useCallback(() => void refetch(), [refetch]);
  useEffect(() => {
    window.addEventListener("focus", rafraichir);
    return () => window.removeEventListener("focus", rafraichir);
  }, [rafraichir]);

  const visibles = tout ? lignes : lignes.slice(0, 5);

  return (
    <section
      data-testid="historique-conformite"
      className="space-y-4 rounded-lg border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl">Historique de conformité</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={rafraichir}>
            Actualiser
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={lignes.length === 0}
            onClick={() => telechargerJournal(dossier.denomination ?? "", lignes)}
          >
            <Download aria-hidden strokeWidth={1.5} />
            Télécharger le journal
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-justify">
        Chaque tentative de génération du projet de statuts est consignée : date et heure, résultat
        et, en cas de refus, les points à traiter. Le journal peut être exporté pour être joint au
        dossier.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement du journal…</p>
      ) : lignes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune génération enregistrée pour l'instant.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((l, i) => (
            <li
              key={`${l.date}-${i}`}
              className="space-y-2 rounded-md border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={l.conforme ? "secondary" : "outline"}>
                  {l.conforme ? "Généré" : "Refusé"}
                </Badge>
                <span className="text-xs text-muted-foreground">{horodatageFr(l.date)}</span>
              </div>
              {l.conforme ? (
                <p className="text-sm text-justify">{l.message}</p>
              ) : (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {l.motifs.map((m, j) => (
                    <li key={j} className="text-justify">
                      {m}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {lignes.length > 5 && (
        <Button type="button" variant="outline" size="sm" onClick={() => setTout((t) => !t)}>
          {tout ? "Afficher les 5 dernières" : `Afficher les ${lignes.length} entrées`}
        </Button>
      )}
    </section>
  );
}
