import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VerifReglementation } from "@/components/VerifReglementation";
import type { Activite } from "@/lib/activites";

const JUSTIFICATIFS = [
  { v: "diplome" as const, t: "Un diplôme ou un titre" },
  { v: "experience" as const, t: "Une expérience professionnelle" },
];

/**
 * Bloc autonome d'une activité de l'objet social : texte statutaire, caractère
 * réglementé et justificatif attendu, propres à cette seule activité.
 */
export function BlocActivite({
  activite,
  index,
  dernier,
  onChange,
  onMonter,
  onDescendre,
  onSupprimer,
}: {
  activite: Activite;
  index: number;
  dernier: boolean;
  onChange: (valeurs: Partial<Activite>) => void;
  onMonter: () => void;
  onDescendre: () => void;
  onSupprimer: () => void;
}) {
  const [verdict, setVerdict] = useState<"oui" | "non" | "incertain" | null>(null);
  /** L'analyse conclut à une activité non réglementée et le client ne l'a pas contredite. */
  const nonReglementee = verdict === "non" && !activite.reglementee;

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {index === 0 ? "Activité principale" : `Activité accessoire ${index}`}
        </span>

        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Monter cette activité"
            disabled={index === 0}
            onClick={onMonter}
          >
            <ArrowUp strokeWidth={1.5} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Descendre cette activité"
            disabled={dernier}
            onClick={onDescendre}
          >
            <ArrowDown strokeWidth={1.5} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Supprimer cette activité"
            onClick={onSupprimer}
          >
            <Trash2 strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      {activite.naf_code && (
        <p className="mb-2 text-xs text-muted-foreground">
          Code INSEE estimé : {activite.naf_code}
          {activite.naf_libelle ? ` — ${activite.naf_libelle}` : ""}
          <span className="block">
            Estimation automatique, non officielle : le code définitif est attribué par l'INSEE
            après immatriculation.
          </span>
        </p>
      )}

      <Label htmlFor={`texte-${activite.id}`} className="sr-only">
        Texte de l'activité inscrit dans les statuts
      </Label>
      <Textarea
        id={`texte-${activite.id}`}
        rows={4}
        maxLength={1000}
        value={activite.texte}
        onChange={(e) => onChange({ texte: e.target.value })}
      />

      <div className="mt-3 space-y-3 rounded-md border border-border bg-muted/40 p-3">
        {!nonReglementee && (
          <p className="text-sm font-medium">Cette activité est-elle réglementée ?</p>
        )}
        <div className={nonReglementee ? "hidden" : "flex items-start gap-3"}>
          <Checkbox
            id={`regl-${activite.id}`}
            checked={activite.reglementee}
            onCheckedChange={(v) =>
              onChange(
                v === true
                  ? { reglementee: true }
                  : { reglementee: false, justificatif_type: null, justificatif_detail: null },
              )
            }
            className="mt-0.5"
          />
          <Label htmlFor={`regl-${activite.id}`} className="text-sm font-normal leading-relaxed">
            Cette activité est réglementée (diplôme, qualification, agrément, carte
            professionnelle ou inscription à un ordre).
          </Label>
        </div>

        <VerifReglementation
          auto
          activite={activite.texte}
          naf={activite.naf_code ? `${activite.naf_code} — ${activite.naf_libelle ?? ""}` : null}
          onVerdict={setVerdict}
          onResultat={(reglementee, resume) => {
            if (!reglementee) return;
            onChange({
              reglementee: true,
              ...(activite.justificatif_detail ? {} : { justificatif_detail: resume.slice(0, 500) }),
            });
          }}
        />

        {nonReglementee && (
          <div
            className="space-y-2 rounded-md border border-border bg-muted/50 p-3 text-sm leading-relaxed"
            data-testid="activite-non-reglementee"
          >
            <p className="font-medium">Cette activité ne semble pas réglementée.</p>
            <p className="text-justify">
              Cette appréciation est automatique et générale : il vous appartient de vérifier
              qu'aucun diplôme, agrément, carte professionnelle ou inscription à un ordre n'est
              exigé pour l'exercer. Si vous poursuivez seul cette démarche, CREA EXPERT et ODEON ne
              peuvent en assumer la responsabilité.
            </p>
            <button
              type="button"
              className="text-sm font-medium underline underline-offset-2"
              onClick={() => onChange({ reglementee: true })}
            >
              Mon activité est en réalité réglementée
            </button>
          </div>
        )}

        {activite.reglementee && (
          <div className="space-y-3 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm leading-relaxed">
            <p className="font-medium">
              Un justificatif sera demandé pour cette activité : sur quoi repose votre
              qualification ?
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {JUSTIFICATIFS.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => onChange({ justificatif_type: o.v })}
                  className={`rounded-md border px-3 py-2.5 text-left text-sm ${
                    activite.justificatif_type === o.v
                      ? "border-accent bg-accent/5"
                      : "border-border bg-background"
                  }`}
                >
                  {o.t}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`justif-${activite.id}`} className="text-sm font-normal">
                Précisez (intitulé du diplôme et année, ou fonctions exercées, employeur et durée)
              </Label>
              <Textarea
                id={`justif-${activite.id}`}
                rows={3}
                maxLength={500}
                value={activite.justificatif_detail ?? ""}
                onChange={(e) => onChange({ justificatif_detail: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Information destinée à orienter la relecture ; le justificatif lui-même se dépose à
                l'étape « Mes documents ». Information générale, sans conseil juridique.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
