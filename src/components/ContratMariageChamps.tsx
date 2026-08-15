import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Associe } from "@/lib/documents";

/** La date existe-t-elle réellement (calendrier), sans être future ni absurde ? */
export function verifierDateContrat(valeur: string): string | null {
  if (!valeur) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur);
  if (!m) return "Date incomplète ou mal formée (jour, mois et année attendus).";
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  const existe =
    d.getUTCFullYear() === annee && d.getUTCMonth() === mois - 1 && d.getUTCDate() === jour;
  if (!existe) return "Cette date n'existe pas au calendrier.";
  if (annee < 1900) return "Date antérieure à 1900 : vérifiez l'année saisie.";
  const aujourdhui = new Date();
  if (d.getTime() > Date.UTC(aujourdhui.getUTCFullYear(), aujourdhui.getUTCMonth(), aujourdhui.getUTCDate()))
    return "La date ne peut pas être postérieure à aujourd'hui.";
  return null;
}

/** Résumé texte conservé pour les documents générés. */
function composer(etude: string, notaire: string, date: string) {
  return [
    date ? `Acte du ${date.split("-").reverse().join("/")}` : "",
    notaire ? `Notaire : ${notaire}` : "",
    etude ? `Étude : ${etude}` : "",
  ]
    .filter(Boolean)
    .join(" — ");
}

/**
 * Étude notariale, nom du notaire et date de l'acte, avec contrôle de cohérence
 * de la date (existence réelle, pas de date future).
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
  const erreurDate = verifierDateContrat(date);

  const patch = (v: Partial<Associe>) => {
    const suivant = {
      etude: v.contrat_mariage_etude ?? etude,
      notaire: v.contrat_mariage_notaire ?? notaire,
      date: v.contrat_mariage_date ?? date,
    };
    maj({
      ...v,
      contrat_mariage_detail: composer(suivant.etude, suivant.notaire, suivant.date),
    });
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
              onChange={(e) => patch({ contrat_mariage_etude: e.target.value })}
            />
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
              onChange={(e) => patch({ contrat_mariage_notaire: e.target.value })}
            />
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
          max={new Date().toISOString().slice(0, 10)}
          min="1900-01-01"
          value={date}
          aria-invalid={erreurDate ? true : undefined}
          aria-describedby={erreurDate ? `datectr-err-${associe.id}` : undefined}
          onChange={(e) => patch({ contrat_mariage_date: e.target.value })}
        />
        {erreurDate ? (
          <p id={`datectr-err-${associe.id}`} className="text-sm text-destructive">
            {erreurDate}
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
