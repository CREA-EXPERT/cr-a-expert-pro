import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { horodatageFr } from "@/lib/journal";
import {
  historiqueDenomination,
  LIBELLE_REVUE,
  LIBELLE_RISQUE,
  type LigneDenomination,
} from "@/lib/denomination-journal";

/** Historique, en lecture seule, des vérifications de dénomination du dossier. */
export function HistoriqueDenomination({ dossierId }: { dossierId: string }) {
  const [lignes, setLignes] = useState<LigneDenomination[]>([]);

  useEffect(() => {
    let vivant = true;
    historiqueDenomination(dossierId).then((l) => {
      if (vivant) setLignes(l);
    });
    return () => {
      vivant = false;
    };
  }, [dossierId]);

  if (lignes.length === 0) return null;

  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-surface p-5"
      data-testid="historique-denomination"
    >
      <div>
        <h3 className="font-serif text-xl">Vérifications de la dénomination</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Informations de risque uniquement : une homonymie n'empêche jamais l'immatriculation.
        </p>
      </div>
      <ul className="space-y-2">
        {lignes.map((l, i) => (
          <li key={`${l.date}-${i}`} className="rounded-md border border-border bg-background p-3">
            <p className="text-sm font-medium">
              {l.denomination || "—"}
              <span className="text-muted-foreground"> — {horodatageFr(l.date)}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={l.risque === "proche" ? "default" : "secondary"}>
                {LIBELLE_RISQUE[l.risque]}
              </Badge>
              <Badge variant="secondary">{LIBELLE_REVUE[l.revue]}</Badge>
              {l.termes.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Termes réglementés : {l.termes.join(", ")}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
