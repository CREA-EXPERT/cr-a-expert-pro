import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Associe } from "@/lib/documents";
import {
  aujourdhuiISO,
  resumeContratMariage,
  validerContratMariage,
} from "@/lib/contrat-mariage";

/**
 * Étude notariale, nom du notaire et date de l'acte, avec contrôles de
 * cohérence explicites (formats, date réelle et non future).
 */
export function ContratMariageChamps({
  associe,
  maj,
}: {
  associe: Associe;
  maj: (v: Partial<Associe>) => void | Promise<void>;
}) {
  const pacs = associe.situation_matrimoniale === "pacse";
  const etude = associe.contrat_mariage_etude ?? "";
  const notaire = associe.contrat_mariage_notaire ?? "";
  const date = associe.contrat_mariage_date ?? "";
  const erreurs = validerContratMariage(associe);

  const patch = (v: Partial<Associe>) => {
    const suivant = { ...associe, ...v };
    maj({ ...v, contrat_mariage_detail: resumeContratMariage(suivant) });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-md border border-border bg-surface p-3">
        <p className="text-sm font-medium">
          {pacs ? "Convention de PACS — notaire" : "Contrat de mariage — notaire"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs" htmlFor={`etude-${associe.id}`}>
              Étude notariale
            </Label>
            <Input
              id={`etude-${associe.id}`}
              maxLength={150}
              placeholder="Ex. SCP Martin & Associés, Nancy"
              value={etude}
              aria-invalid={erreurs.etude ? true : undefined}
              aria-describedby={erreurs.etude ? `etude-err-${associe.id}` : undefined}
              onChange={(e) => patch({ contrat_mariage_etude: e.target.value })}
            />
            {erreurs.etude && (
              <p id={`etude-err-${associe.id}`} className="text-sm text-destructive">
                {erreurs.etude}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor={`notaire-${associe.id}`}>
              Nom du notaire
            </Label>
            <Input
              id={`notaire-${associe.id}`}
              maxLength={120}
              placeholder="Ex. Maître Claire Martin"
              value={notaire}
              aria-invalid={erreurs.notaire ? true : undefined}
              aria-describedby={erreurs.notaire ? `notaire-err-${associe.id}` : undefined}
              onChange={(e) => patch({ contrat_mariage_notaire: e.target.value })}
            />
            {erreurs.notaire && (
              <p id={`notaire-err-${associe.id}`} className="text-sm text-destructive">
                {erreurs.notaire}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-border bg-surface p-3">
        <Label className="text-sm font-medium" htmlFor={`datectr-${associe.id}`}>
          {pacs ? "Date de la convention" : "Date du contrat"}
        </Label>
        <Input
          id={`datectr-${associe.id}`}
          type="date"
          max={aujourdhuiISO()}
          min="1900-01-01"
          value={date}
          aria-invalid={erreurs.date ? true : undefined}
          aria-describedby={erreurs.date ? `datectr-err-${associe.id}` : undefined}
          onChange={(e) => patch({ contrat_mariage_date: e.target.value })}
        />
        {erreurs.date ? (
          <p id={`datectr-err-${associe.id}`} className="text-sm text-destructive">
            {erreurs.date}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Date figurant sur l'acte reçu par le notaire. Nous vérifions qu'elle existe bien au
            calendrier et qu'elle n'est pas postérieure à aujourd'hui.
          </p>
        )}
      </div>
    </div>
  );
}
