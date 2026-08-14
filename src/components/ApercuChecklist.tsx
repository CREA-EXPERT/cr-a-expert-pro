import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { analyserChecklist, LIBELLE_STATUT_PIECE, REGLES_ANTI_REJET, type StatutPiece } from "@/lib/checklist";
import type { Associe, Dossier } from "@/lib/documents";

const ORDRE_GROUPES: StatutPiece[] = ["a_televerser", "genere", "guichet_unique", "rien_a_fournir"];

const INTRO: Record<StatutPiece, string> = {
  a_televerser: "Vous déposez ces pièces dans « Mes documents ».",
  genere: "Nous rédigeons ces documents à partir de vos réponses.",
  guichet_unique: "Ces éléments sont déclarés en ligne lors du dépôt, sans pièce à joindre.",
  rien_a_fournir: "Votre situation ne demande aucune pièce sur ces points.",
};

/** Aperçu, en lecture seule, de la checklist déduite de la situation déclarée. */
export function ApercuChecklist({ dossier, associes }: { dossier: Dossier; associes: Associe[] }) {
  const analyse = analyserChecklist(dossier, associes);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
      <div>
        <h3 className="font-serif text-xl">Vos pièces justificatives</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Liste établie à partir de vos réponses. Elle évolue si votre situation change.
        </p>
      </div>

      {ORDRE_GROUPES.map((statut) => {
        const lot = analyse.pieces.filter((p) => p.statut === statut).sort((a, b) => a.ordre - b.ordre);
        if (lot.length === 0) return null;
        return (
          <div key={statut} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statut === "a_televerser" ? "default" : "secondary"}>
                {LIBELLE_STATUT_PIECE[statut]}
              </Badge>
              <span className="text-sm text-muted-foreground">{INTRO[statut]}</span>
            </div>
            <ul className="space-y-2">
              {lot.map((p) => (
                <li key={p.code} className="rounded-md border border-border bg-background p-3">
                  <p className="text-sm font-medium">
                    {p.libelle}
                    {p.personne && <span className="text-muted-foreground"> — {p.personne}</span>}
                    {!p.obligatoire && statut === "a_televerser" && (
                      <span className="text-muted-foreground"> (si applicable)</span>
                    )}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.pourquoi}</p>
                  {p.exigences && (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.exigences}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {analyse.riens.length > 0 && (
        <div className="space-y-1 rounded-md border border-border bg-background p-3">
          <p className="text-sm font-medium">Ce que vous n'avez pas à fournir</p>
          <ul className="space-y-1">
            {analyse.riens.map((r) => (
              <li key={r} className="text-sm leading-relaxed text-muted-foreground">
                — {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
        Le dépôt de vos pièces s'ouvrira dans « Mes documents » une fois votre dossier validé à la
        dernière étape.
      </p>

      <div className="space-y-1 rounded-md border border-border bg-background p-3">
        <p className="text-sm font-medium">Les règles qui évitent un rejet</p>
        <ul className="space-y-1">
          {REGLES_ANTI_REJET.map((r) => (
            <li key={r} className="text-sm leading-relaxed text-muted-foreground">
              — {r}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
