import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { horodatageFr } from "@/lib/journal";
import {
  historiqueDenomination,
  LIBELLE_REVUE,
  LIBELLE_RISQUE,
  telechargerJournalDenomination,
  type EtatRevue,
  type LigneDenomination,
} from "@/lib/denomination-journal";
import type { NiveauRisqueDenomination } from "@/lib/denomination";

const RISQUES: NiveauRisqueDenomination[] = ["aucun", "eloigne", "proche"];
const REVUES: EtatRevue[] = ["aucune", "recommandee", "systematique"];

function normaliser(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Historique, en lecture seule, des vérifications de dénomination du dossier. */
export function HistoriqueDenomination({
  dossierId,
  titre = "",
}: {
  dossierId: string;
  /** Dénomination du dossier, reprise dans le fichier exporté. */
  titre?: string;
}) {
  const [lignes, setLignes] = useState<LigneDenomination[]>([]);
  const [recherche, setRecherche] = useState("");
  const [risque, setRisque] = useState<string>("tous");
  const [revue, setRevue] = useState<string>("toutes");

  useEffect(() => {
    let vivant = true;
    historiqueDenomination(dossierId).then((l) => {
      if (vivant) setLignes(l);
    });
    return () => {
      vivant = false;
    };
  }, [dossierId]);

  const filtrees = useMemo(() => {
    const q = normaliser(recherche.trim());
    return lignes.filter((l) => {
      if (risque !== "tous" && l.risque !== risque) return false;
      if (revue !== "toutes" && l.revue !== revue) return false;
      if (q === "") return true;
      return normaliser(`${l.denomination} ${l.termes.join(" ")}`).includes(q);
    });
  }, [lignes, recherche, risque, revue]);

  if (lignes.length === 0) return null;

  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-surface p-5"
      data-testid="historique-denomination"
    >
      <div>
        <h3 className="font-serif text-xl">Vérifications de la dénomination</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Informations de risque uniquement : une homonymie n'empêche jamais l'immatriculation.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="rech-denom">Rechercher</Label>
          <Input
            id="rech-denom"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom testé ou terme réglementé"
          />
        </div>
        <div className="space-y-1">
          <Label>Niveau de risque</Label>
          <Select value={risque} onValueChange={setRisque}>
            <SelectTrigger aria-label="Niveau de risque">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les niveaux</SelectItem>
              {RISQUES.map((r) => (
                <SelectItem key={r} value={r}>
                  {LIBELLE_RISQUE[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Revue cabinet</Label>
          <Select value={revue} onValueChange={setRevue}>
            <SelectTrigger aria-label="Revue cabinet">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Tous les états</SelectItem>
              {REVUES.map((r) => (
                <SelectItem key={r} value={r}>
                  {LIBELLE_REVUE[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" data-testid="denom-compteur">
          {filtrees.length} vérification{filtrees.length > 1 ? "s" : ""} affichée
          {filtrees.length > 1 ? "s" : ""} sur {lignes.length}.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => telechargerJournalDenomination(titre, filtrees)}
        >
          Télécharger le journal (CSV)
        </Button>
      </div>

      {filtrees.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune vérification ne correspond au filtre.</p>
      ) : (
        <ul className="space-y-2">
          {filtrees.map((l, i) => (
            <li
              key={`${l.date}-${i}`}
              className="rounded-md border border-border bg-background p-3"
            >
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
      )}
    </section>
  );
}
