import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ACCEPT_ATTR, formaterTaille, validerFichier } from "@/lib/pieces";
import { cn } from "@/lib/utils";
import { Upload, X } from "lucide-react";

export type Transfert = {
  id: string;
  nom: string;
  taille: number;
  progression: number;
  erreur?: string;
};

/**
 * Zone de glisser-déposer accessible (clavier + ARIA), en complément du bouton
 * de sélection classique. Les fichiers sont validés avant tout téléversement.
 */
export function ZoneDepot({
  onFichiers,
  multiple = true,
  disabled = false,
  libelle = "Glissez vos fichiers ici",
  aide = "PDF, JPG ou PNG — 10 Mo maximum par fichier.",
  className,
}: {
  onFichiers: (fichiers: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  libelle?: string;
  aide?: string;
  className?: string;
}) {
  const [survol, setSurvol] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const traiter = useCallback(
    (liste: FileList | null) => {
      const fichiers = Array.from(liste ?? []);
      if (fichiers.length === 0) return;
      const valides: File[] = [];
      for (const f of fichiers) {
        const erreur = validerFichier(f);
        if (erreur) toast.error(erreur);
        else valides.push(f);
      }
      if (valides.length > 0) onFichiers(multiple ? valides : valides.slice(0, 1));
    },
    [multiple, onFichiers],
  );

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={`${libelle}. ${aide}`}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          input.current?.click();
        }
      }}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setSurvol(false);
        traiter(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-input bg-background p-6 text-center transition-colors",
        !disabled &&
          "cursor-pointer hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        survol && "border-accent bg-accent/10",
        disabled && "opacity-60",
        className,
      )}
    >
      <Upload className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden />
      <p className="text-sm font-medium">{libelle}</p>
      <p className="text-xs text-muted-foreground">{aide}</p>
      <span className="text-xs underline underline-offset-2">ou choisir un fichier</span>
      <input
        ref={input}
        type="file"
        className="sr-only"
        tabIndex={-1}
        multiple={multiple}
        disabled={disabled}
        accept={ACCEPT_ATTR}
        onChange={(e) => {
          traiter(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Liste des fichiers en cours de dépôt : nom, taille, progression, retrait. */
export function ListeTransferts({
  transferts,
  onSupprimer,
}: {
  transferts: Transfert[];
  onSupprimer: (id: string) => void;
}) {
  if (transferts.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2" aria-live="polite">
      {transferts.map((t) => (
        <li key={t.id} className="rounded-md border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm">{t.nom}</p>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted-foreground">{formaterTaille(t.taille)}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label={`Retirer ${t.nom}`}
                onClick={() => onSupprimer(t.id)}
              >
                <X className="size-4" strokeWidth={1.5} aria-hidden />
              </Button>
            </div>
          </div>
          {t.erreur ? (
            <p className="mt-1 text-xs text-destructive">{t.erreur}</p>
          ) : (
            <Progress
              value={t.progression}
              className="mt-2 h-1.5"
              aria-label={`Progression du dépôt de ${t.nom}`}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
