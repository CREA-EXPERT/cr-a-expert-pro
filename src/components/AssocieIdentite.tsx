import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CIVILITES, MOIS, NB_PRENOMS_MAX, PAYS } from "@/lib/domain";
import type { Associe } from "@/lib/documents";
import { NormaliserAdresse } from "@/components/NormaliserAdresse";
import { Plus, X } from "lucide-react";

const champ = "h-10 w-full rounded-md border border-input bg-surface px-3 text-sm";

function decompose(iso: string | null) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? { a: m[1]!, mo: String(Number(m[2])), j: String(Number(m[3])) } : { a: "", mo: "", j: "" };
}

const ANNEES = Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - 16 - i));
const JOURS = Array.from({ length: 31 }, (_, i) => String(i + 1));

export function AssocieIdentite({
  associe,
  onChange,
}: {
  associe: Associe;
  onChange: (v: Partial<Associe>) => void;
}) {
  const prenoms = associe.prenoms && associe.prenoms.length > 0 ? associe.prenoms : [associe.prenom ?? ""];
  /**
   * Les trois listes de la date de naissance sont conservées localement : une date
   * incomplète n'est pas enregistrable, mais les choix déjà faits doivent rester
   * affichés jusqu'à ce que le jour, le mois et l'année soient renseignés.
   */
  const [d, setD] = useState(() => decompose(associe.date_naissance));

  useEffect(() => {
    const depuisBase = decompose(associe.date_naissance);
    if (depuisBase.j && depuisBase.mo && depuisBase.a) setD(depuisBase);
  }, [associe.date_naissance]);

  function majPrenoms(liste: string[]) {
    const nettoyes = liste.map((p) => p.trim()).filter(Boolean);
    onChange({ prenoms: liste, prenom: nettoyes.join(" ") });
  }

  function majDate(part: "j" | "mo" | "a", val: string) {
    const suivant = { ...d, [part]: val };
    setD(suivant);
    if (!suivant.j || !suivant.mo || !suivant.a) {
      if (associe.date_naissance) onChange({ date_naissance: null });
      return;
    }
    onChange({
      date_naissance: `${suivant.a}-${String(Number(suivant.mo)).padStart(2, "0")}-${String(Number(suivant.j)).padStart(2, "0")}`,
    });
  }
  /** Une date partiellement renseignée n'est pas enregistrable : on le signale. */
  const dateIncomplete = Boolean((d.j || d.mo || d.a) && !(d.j && d.mo && d.a));


  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Civilité</Label>
          <select
            className={champ}
            value={associe.civilite ?? ""}
            onChange={(e) => onChange({ civilite: e.target.value })}
          >
            <option value="">Choisir…</option>
            {CIVILITES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nom</Label>
          <Input
            maxLength={80}
            value={associe.nom ?? ""}
            onChange={(e) => onChange({ nom: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Prénom(s), dans l'ordre de la pièce d'identité</Label>
        <div className="space-y-2">
          {prenoms.map((p, i) => (
            <div key={i} className="flex gap-2">
              <Input
                maxLength={60}
                placeholder={i === 0 ? "Premier prénom" : `Prénom ${i + 1}`}
                value={p}
                onChange={(e) => {
                  const copie = [...prenoms];
                  copie[i] = e.target.value;
                  majPrenoms(copie);
                }}
              />
              {prenoms.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Supprimer le prénom ${i + 1}`}
                  onClick={() => majPrenoms(prenoms.filter((_, k) => k !== i))}
                >
                  <X strokeWidth={1.5} />
                </Button>
              )}
            </div>
          ))}
        </div>
        {prenoms.length < NB_PRENOMS_MAX && (
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => majPrenoms([...prenoms, ""])}>
            <Plus strokeWidth={1.5} /> Ajouter un prénom
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Jusqu'à {NB_PRENOMS_MAX} prénoms, comme sur les documents d'identité officiels.
        </p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Nom de naissance (si différent)</Label>
        <Input
          maxLength={80}
          value={associe.nom_naissance ?? ""}
          onChange={(e) => onChange({ nom_naissance: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Date de naissance (jour / mois / année)</Label>
        <div className="grid grid-cols-3 gap-2">
          <select
            className={champ}
            aria-label="Jour de naissance"
            value={d.j}
            onChange={(e) => majDate("j", e.target.value)}
          >
            <option value="">Jour</option>
            {JOURS.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
          <select
            className={champ}
            aria-label="Mois de naissance"
            value={d.mo}
            onChange={(e) => majDate("mo", e.target.value)}
          >
            <option value="">Mois</option>
            {MOIS.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
          <select
            className={champ}
            aria-label="Année de naissance"
            value={d.a}
            onChange={(e) => majDate("a", e.target.value)}
          >
            <option value="">Année</option>
            {ANNEES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        {dateIncomplete && (
          <p role="alert" className="text-sm font-medium text-destructive">
            Sélectionnez le jour, le mois et l'année : la date de naissance doit être complète.
          </p>
        )}
      </div>


      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Lieu de naissance (commune et pays)</Label>
          <Input
            maxLength={120}
            value={associe.lieu_naissance ?? ""}
            onChange={(e) => onChange({ lieu_naissance: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nationalité</Label>
          <Input
            maxLength={60}
            value={associe.nationalite ?? ""}
            onChange={(e) => onChange({ nationalite: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Adresse (numéro et voie)</Label>
          <Input
            maxLength={200}
            value={associe.adresse ?? ""}
            onChange={(e) => onChange({ adresse: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Code postal</Label>
          <Input
            maxLength={12}
            inputMode="numeric"
            value={associe.adresse_code_postal ?? ""}
            onChange={(e) => onChange({ adresse_code_postal: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ville</Label>
          <Input
            maxLength={100}
            value={associe.adresse_ville ?? ""}
            onChange={(e) => onChange({ adresse_ville: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Pays</Label>
          <select
            className={champ}
            value={associe.adresse_pays ?? "France"}
            onChange={(e) => onChange({ adresse_pays: e.target.value })}
          >
            {PAYS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <NormaliserAdresse
          voie={associe.adresse ?? ""}
          codePostal={associe.adresse_code_postal ?? ""}
          ville={associe.adresse_ville ?? ""}
          pays={associe.adresse_pays ?? "France"}
          onRetenir={(v) => onChange(v)}
        />

        <div className="space-y-1">
          <Label className="text-xs">Adresse électronique</Label>
          <Input
            type="email"
            maxLength={255}
            value={associe.email ?? ""}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
