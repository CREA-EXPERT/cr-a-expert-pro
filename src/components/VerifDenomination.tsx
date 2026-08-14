import { useState } from "react";
import { ExternalLink, Loader2, Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type Trouvee = { nom: string; siren: string; activite: string | null; commune: string | null };

const normaliser = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Contrôle non bloquant de la dénomination auprès de l'annuaire public des
 * entreprises (recherche-entreprises.api.gouv.fr, service gratuit).
 */
export function VerifDenomination({ denomination }: { denomination: string }) {
  const [etat, setEtat] = useState<"idle" | "chargement" | "fait" | "erreur">("idle");
  const [resultats, setResultats] = useState<Trouvee[]>([]);

  const rechercher = async () => {
    const q = denomination.trim();
    if (q.length < 3) return;
    setEtat("chargement");
    try {
      const r = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&per_page=10&page=1`,
      );
      if (!r.ok) throw new Error("indisponible");
      const j = (await r.json()) as {
        results?: {
          nom_complet?: string;
          nom_raison_sociale?: string;
          siren?: string;
          activite_principale?: string;
          siege?: { libelle_commune?: string };
        }[];
      };
      const cible = normaliser(q);
      const items = (j.results ?? [])
        .map((e) => ({
          nom: e.nom_raison_sociale || e.nom_complet || "",
          siren: e.siren ?? "",
          activite: e.activite_principale ?? null,
          commune: e.siege?.libelle_commune ?? null,
        }))
        .filter((e) => {
          const n = normaliser(e.nom);
          return n === cible || n.includes(cible) || cible.includes(n);
        });
      setResultats(items);
      setEtat("fait");
    } catch {
      setEtat("erreur");
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-surface p-4 text-sm leading-relaxed">
      <p className="font-medium">Une entreprise porte-t-elle déjà ce nom ?</p>
      <p className="text-muted-foreground">
        Nous interrogeons l'annuaire public des entreprises. Ce contrôle est informatif : il ne
        bloque pas votre parcours.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={rechercher} disabled={denomination.trim().length < 3}>
        {etat === "chargement" ? (
          <Loader2 className="animate-spin" strokeWidth={1.5} />
        ) : (
          <Search strokeWidth={1.5} />
        )}
        Rechercher ce nom
      </Button>

      {etat === "erreur" && (
        <p className="text-muted-foreground">
          Le service de recherche est momentanément indisponible. Vous pouvez poursuivre.
        </p>
      )}

      {etat === "fait" && resultats.length === 0 && (
        <p className="text-muted-foreground">
          Aucune entreprise portant un nom identique ou très proche n'a été trouvée. Cela ne vaut
          pas garantie de disponibilité : vérifiez également les marques déposées.
        </p>
      )}

      {etat === "fait" && resultats.length > 0 && (
        <div className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3">
          <p className="flex items-start gap-2 font-medium">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            Une dénomination identique ou similaire existe déjà.
          </p>
          <p>
            Cela n'empêche pas l'immatriculation mais peut créer un risque de confusion ou de
            contentieux. Pensez aussi à vérifier les marques déposées sur data.inpi.fr.
          </p>
          <ul className="space-y-1">
            {resultats.map((e) => (
              <li key={e.siren} className="text-muted-foreground">
                — {e.nom} (SIREN {e.siren}
                {e.commune ? `, ${e.commune}` : ""})
              </li>
            ))}
          </ul>
        </div>
      )}

      <p>
        <a
          href="https://data.inpi.fr/search?displayStyle=LIST&type=MARQUES"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
        >
          Rechercher une marque déposée (INPI)
          <ExternalLink className="size-3.5" strokeWidth={1.5} aria-hidden />
        </a>
      </p>
    </div>
  );
}
