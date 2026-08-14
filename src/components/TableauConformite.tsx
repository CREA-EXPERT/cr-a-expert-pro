import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exporterJournal, type LigneConformite } from "@/lib/conformite";
import { horodatageFr } from "@/lib/journal";
import { Download } from "lucide-react";

export type LigneDossier = {
  id: string;
  denomination: string;
  forme: string;
  refus: number;
  reussites: number;
  motifs: string[];
  dernier: string | null;
  premierEssai: string | null;
  valideLe: string | null;
  delaiHeures: number | null;
  journal: LigneConformite[];
};

const PAR_PAGE = 50;

export function dureeFr(h: number) {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${Math.round(h / 24)} j`;
}

type Tri = "recent" | "refus" | "denomination" | "delai";

/**
 * Tableau des dossiers suivis en conformité : recherche, filtres, tri,
 * pagination et export CSV du périmètre affiché.
 */
export function TableauConformite({
  lignes,
  isLoading = false,
  isError = false,
  onReessayer,
  debut,
  fin,
  onPeriode,
}: {
  lignes: LigneDossier[];
  isLoading?: boolean;
  isError?: boolean;
  onReessayer?: () => void;
  debut: string;
  fin: string;
  onPeriode: (debut: string, fin: string) => void;
}) {
  const [recherche, setRecherche] = useState("");
  const [forme, setForme] = useState("");
  const [statut, setStatut] = useState("");
  const [tri, setTri] = useState<Tri>("recent");
  const [page, setPage] = useState(0);

  const formes = useMemo(
    () => [...new Set(lignes.map((l) => l.forme).filter(Boolean))].sort(),
    [lignes],
  );

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const liste = lignes.filter((l) => {
      if (q && !l.denomination.toLowerCase().includes(q)) return false;
      if (forme && l.forme !== forme) return false;
      if (statut === "avec_refus" && l.refus === 0) return false;
      if (statut === "sans_refus" && l.refus > 0) return false;
      if (statut === "valide" && !l.valideLe) return false;
      return true;
    });
    const ordonnees = [...liste];
    ordonnees.sort((a, b) => {
      if (tri === "refus") return b.refus - a.refus;
      if (tri === "denomination") return a.denomination.localeCompare(b.denomination, "fr");
      if (tri === "delai") return (b.delaiHeures ?? -1) - (a.delaiHeures ?? -1);
      return (b.dernier ?? "").localeCompare(a.dernier ?? "");
    });
    return ordonnees;
  }, [lignes, recherche, forme, statut, tri]);

  const pages = Math.max(1, Math.ceil(filtrees.length / PAR_PAGE));
  const pageCourante = Math.min(page, pages - 1);
  const visibles = filtrees.slice(pageCourante * PAR_PAGE, (pageCourante + 1) * PAR_PAGE);

  function exporter() {
    const evenements = filtrees.flatMap((l) =>
      l.journal.map((j) => ({ ...j, dossierId: l.id, denomination: l.denomination })),
    );
    void exporterJournal(
      "Suivi de conformité",
      evenements,
      `suivi de conformité — ${filtrees.length} dossier${filtrees.length > 1 ? "s" : ""} filtré${
        filtrees.length > 1 ? "s" : ""
      }`,
      filtrees.map((l) => l.id),
    );
  }

  return (
    <section className="space-y-6" data-testid="tableau-conformite">
      <div className="grid gap-4 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="recherche">Rechercher une dénomination</Label>
          <Input
            id="recherche"
            value={recherche}
            placeholder="Nom de la société"
            onChange={(e) => {
              setRecherche(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="forme">Forme juridique</Label>
          <select
            id="forme"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={forme}
            onChange={(e) => {
              setForme(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Toutes</option>
            {formes.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="statut">Statut</Label>
          <select
            id="statut"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={statut}
            onChange={(e) => {
              setStatut(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tous</option>
            <option value="avec_refus">Avec refus</option>
            <option value="sans_refus">Sans refus</option>
            <option value="valide">Validé</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="debut">Depuis le</Label>
          <Input
            id="debut"
            type="date"
            value={debut}
            onChange={(e) => onPeriode(e.target.value, fin)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fin">Jusqu'au</Label>
          <Input id="fin" type="date" value={fin} onChange={(e) => onPeriode(debut, e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tri">Trier par</Label>
          <select
            id="tri"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={tri}
            onChange={(e) => setTri(e.target.value as Tri)}
          >
            <option value="recent">Tentative la plus récente</option>
            <option value="refus">Nombre de refus</option>
            <option value="denomination">Dénomination</option>
            <option value="delai">Délai avant validation</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filtrees.length} dossier{filtrees.length > 1 ? "s" : ""} dans le périmètre affiché.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="export-csv-conformite"
          disabled={filtrees.length === 0}
          onClick={exporter}
        >
          <Download aria-hidden strokeWidth={1.5} />
          Exporter en CSV
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement des dossiers…</p>
      ) : isError ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Chargement impossible, réessayez dans un instant.
          </p>
          {onReessayer && (
            <Button type="button" variant="outline" size="sm" onClick={onReessayer}>
              Réessayer
            </Button>
          )}
        </div>
      ) : visibles.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="conformite-vide">
          Aucun événement sur la période retenue.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((l) => (
            <li key={l.id} className="space-y-3 rounded-lg border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{l.denomination}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.forme} · dernière tentative :{" "}
                    {l.dernier ? horodatageFr(l.dernier) : "aucune"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={l.refus > 0 ? "outline" : "secondary"}>{l.refus} refus</Badge>
                  <Badge variant="secondary">{l.reussites} générés</Badge>
                  <Badge variant="outline">
                    {l.delaiHeures === null
                      ? "Validation en attente"
                      : `Validé en ${dureeFr(l.delaiHeures)}`}
                  </Badge>
                </div>
              </div>
              {l.motifs.length > 0 && (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {l.motifs.slice(0, 4).map((m, i) => (
                    <li key={i} className="text-justify">
                      {m}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/cabinet/$id" params={{ id: l.id }}>
                    Ouvrir le dossier
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={l.journal.length === 0}
                  onClick={() =>
                    void exporterJournal(
                      l.denomination,
                      l.journal.map((j) => ({
                        ...j,
                        dossierId: l.id,
                        denomination: l.denomination,
                      })),
                      "journal du dossier",
                      [l.id],
                    )
                  }
                >
                  <Download aria-hidden strokeWidth={1.5} />
                  Journal
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pageCourante === 0}
            onClick={() => setPage(pageCourante - 1)}
          >
            Page précédente
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pageCourante + 1} sur {pages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pageCourante >= pages - 1}
            onClick={() => setPage(pageCourante + 1)}
          >
            Page suivante
          </Button>
        </div>
      )}
    </section>
  );
}
