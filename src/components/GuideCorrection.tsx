import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { ChampManquant } from "@/lib/statuts-sas";
import { numeroEtape, TITRES, CLES_EI, CLES_SOCIETE } from "@/lib/etapes";
import { isEI } from "@/lib/domain";
import type { Dossier } from "@/lib/documents";

/**
 * Guide de correction : regroupe les champs juridiques manquants par étape du
 * parcours et propose d'ouvrir directement l'étape concernée.
 */
export function GuideCorrection({
  dossier,
  manquants,
}: {
  dossier: Dossier;
  manquants: ChampManquant[];
}) {
  if (manquants.length === 0) return null;
  const ei = isEI(dossier.forme_juridique ?? "");
  const cles = ei ? CLES_EI : CLES_SOCIETE;

  const groupes = new Map<string, ChampManquant[]>();
  for (const m of manquants) {
    groupes.set(m.etape, [...(groupes.get(m.etape) ?? []), m]);
  }
  const ordonnes = [...groupes.entries()].sort(
    ([a], [b]) => (numeroEtape(a, ei) ?? 99) - (numeroEtape(b, ei) ?? 99),
  );

  return (
    <div
      data-testid="guide-correction"
      className="rounded-md border border-border bg-background p-4"
    >
      <p className="text-sm font-medium">Guide de correction</p>
      <p className="mt-1 text-sm text-muted-foreground text-justify">
        Voici, étape par étape, les informations à compléter pour débloquer la génération. Chaque
        bouton ouvre directement l'étape concernée du parcours.
      </p>
      <ul className="mt-4 space-y-4">
        {ordonnes.map(([etape, champs]) => {
          const numero = numeroEtape(etape, ei);
          const titre = numero ? TITRES[cles[numero - 1]!] : etape;
          return (
            <li key={etape} className="space-y-2">
              <p className="text-sm font-medium">
                {numero ? `Étape ${numero} — ${titre}` : titre}
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {champs.map((c, i) => (
                  <li key={`${c.champ}-${i}`} className="text-justify">
                    {c.champ}
                  </li>
                ))}
              </ul>
              {numero && (
                <Button asChild size="sm" variant="outline">
                  <Link to="/creation" search={{ etape: numero }}>
                    Compléter l'étape « {titre} »
                  </Link>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground text-justify">
        Information générale — ne constitue pas un conseil. Votre dossier sera revu par un
        expert-comptable.
      </p>
    </div>
  );
}
