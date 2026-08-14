import { useEffect, useState } from "react";
import { ExternalLink, Info, Loader2, Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EncadrePliable } from "@/components/EncadrePliable";
import {
  classerHomonymes,
  revueSystematique,
  termesReglementesDetectes,
  type EntrepriseHomonyme,
  type NiveauRisqueDenomination,
} from "@/lib/denomination";

const normaliser = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const LIEN_INPI = "https://data.inpi.fr/search?displayStyle=LIST&type=MARQUES";

function LienInpi() {
  return (
    <div className="space-y-1">
      <a
        href={LIEN_INPI}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
      >
        Rechercher une marque déposée (INPI)
        <ExternalLink className="size-3.5" strokeWidth={1.5} aria-hidden />
      </a>
      <p className="text-xs text-muted-foreground">
        Recherche gratuite. La vérification des marques n'est pas automatisée : elle relève de votre
        appréciation ou de la relecture par l'expert-comptable.
      </p>
    </div>
  );
}

/**
 * Contrôle informatif de la dénomination auprès de l'annuaire public des
 * entreprises. Le résultat n'est jamais bloquant : il indique un niveau de
 * risque de confusion, jamais une indisponibilité.
 */
export function VerifDenomination({
  denomination,
  codesNaf = [],
  onRisque,
  dossierId,
}: {
  denomination: string;
  /** Dossier auquel rattacher l'historique des vérifications. */
  dossierId?: string;
  /** Codes NAF des activités du dossier, pour apprécier la proximité d'activité. */
  codesNaf?: (string | null | undefined)[];
  onRisque?: (niveau: NiveauRisqueDenomination | null) => void;
}) {
  const [etat, setEtat] = useState<"idle" | "chargement" | "fait" | "erreur">("idle");
  const [resultats, setResultats] = useState<EntrepriseHomonyme[]>([]);
  const [niveau, setNiveau] = useState<NiveauRisqueDenomination | null>(null);

  const termes = termesReglementesDetectes(denomination);

  useEffect(() => {
    setEtat("idle");
    setResultats([]);
    setNiveau(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [denomination]);

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
          libelle_activite_principale?: string;
          siege?: { libelle_commune?: string };
        }[];
      };
      const cible = normaliser(q);
      const items: EntrepriseHomonyme[] = (j.results ?? [])
        .map((e) => ({
          nom: e.nom_raison_sociale || e.nom_complet || "",
          siren: e.siren ?? "",
          naf: e.activite_principale ?? null,
          naf_libelle: e.libelle_activite_principale ?? null,
          commune: e.siege?.libelle_commune ?? null,
        }))
        .filter((e) => {
          const n = normaliser(e.nom);
          return n === cible || n.includes(cible) || cible.includes(n);
        });
      const n = classerHomonymes(items, codesNaf);
      setResultats(items);
      setNiveau(n);
      setEtat("fait");
      onRisque?.(n);
      if (dossierId) {
        const { journaliserVerificationDenomination } = await import("@/lib/denomination-journal");
        await journaliserVerificationDenomination(dossierId, q, n, termes);
      }
    } catch {
      setEtat("erreur");
    }
  };

  return (
    <div
      className="space-y-3 rounded-md border border-border bg-surface p-4 text-sm leading-relaxed"
      data-testid="verif-denomination"
    >
      <p className="font-medium">Ce nom est-il déjà porté par une autre entreprise ?</p>
      <p className="text-muted-foreground">
        Nous interrogeons l'annuaire public des entreprises. Ce contrôle est purement informatif :
        le choix de la dénomination est libre et une homonymie n'empêche pas l'immatriculation.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={rechercher}
        disabled={denomination.trim().length < 3}
      >
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

      {etat === "fait" && niveau === "aucun" && (
        <p className="rounded-md border border-border bg-muted/50 p-3">
          Aucune entreprise immatriculée ne porte ce nom. Pensez tout de même à vérifier les marques
          déposées (lien ci-dessous).
        </p>
      )}

      {etat === "fait" && niveau === "eloigne" && (
        <div className="space-y-2 rounded-md border border-border bg-muted/50 p-3">
          <p className="flex items-start gap-2 font-medium">
            <Info className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            Ce nom est déjà porté par d'autres entreprises.
          </p>
          <p>
            Cela ne vous empêche pas de l'utiliser : un nom n'est protégé que s'il existe un risque
            de confusion, notamment en cas d'activité identique ou proche. Vérifiez les marques
            déposées.
          </p>
          <ListeHomonymes resultats={resultats} />
        </div>
      )}

      {etat === "fait" && niveau === "proche" && (
        <div
          className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3"
          data-testid="risque-proche"
        >
          <p className="flex items-start gap-2 font-medium">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            Une ou plusieurs entreprises exercent une activité proche sous ce nom.
          </p>
          <p>
            Le greffe ne refusera pas votre immatriculation pour autant, mais vous vous exposez à
            une action du concurrent (concurrence déloyale, art. 1240 C. civ., voire contrefaçon de
            marque, art. L. 713-2 et L. 713-3 CPI). Nous vous recommandons de vérifier les marques
            et, en cas de doute, de choisir un autre nom ou de demander la relecture par
            l'expert-comptable.
          </p>
          <ListeHomonymes resultats={resultats} />
        </div>
      )}

      {termes.length > 0 && (
        <p
          className="rounded-md border border-warning/40 bg-warning/10 p-3"
          data-testid="terme-reglemente"
        >
          Ce terme est réservé ou réglementé ({termes.join(", ")}) — dossier soumis à revue du
          cabinet.
          {revueSystematique(termes)
            ? " Cette dénomination fait l'objet d'une revue systématique avant dépôt."
            : ""}
        </p>
      )}

      <LienInpi />

      <EncadrePliable titre="Un nom déjà utilisé est-il interdit ?">
        <p>
          Non. Le choix de la dénomination sociale est libre : les statuts la déterminent (art. L.
          210-2 du code de commerce). Le greffe et le guichet unique ne contrôlent pas la
          disponibilité du nom, et une homonymie n'est jamais un motif de rejet de
          l'immatriculation.
        </p>
        <p>
          Un nom « pris » n'est pas pour autant un nom « protégé ». Ce qui est interdit, c'est de
          créer un risque de confusion avec un signe antérieur protégé :
        </p>
        <ul className="space-y-1 pl-5 [&>li]:list-disc">
          <li>
            une marque antérieure enregistrée, pour des produits ou services identiques ou
            similaires (art. L. 713-2 et L. 713-3 du code de la propriété intellectuelle ; action en
            contrefaçon, art. L. 716-4 CPI) ;
          </li>
          <li>
            une dénomination sociale, un nom commercial, une enseigne ou un nom de domaine
            antérieurs, s'il existe un risque de confusion dans l'esprit du public (art. L. 711-3
            CPI ; concurrence déloyale sur le fondement de l'art. 1240 du code civil). Ce risque
            suppose en pratique une activité identique ou proche et une clientèle commune : la
            dénomination sociale est protégée sur tout le territoire dès l'immatriculation, le nom
            commercial et l'enseigne seulement dans leur zone de rayonnement effectif ;
          </li>
          <li>
            certains termes réglementés réservés à des professions ou activités — « expert-comptable
            » (art. 2 de l'ordonnance n° 45-2138 du 19 septembre 1945), « banque » (art. L. 511-8 du
            code monétaire et financier) — ainsi que toute dénomination trompeuse.
          </li>
        </ul>
        <p className="font-medium">En pratique</p>
        <ul className="space-y-1 pl-5 [&>li]:list-disc">
          <li>Homonymie avec une activité différente : généralement possible.</li>
          <li>
            Homonymie avec une activité identique ou proche : risque civil réel, sans rejet du
            greffe.
          </li>
          <li>Marque antérieure sur la même activité : risque le plus sérieux.</li>
        </ul>
      </EncadrePliable>
    </div>
  );
}

function ListeHomonymes({ resultats }: { resultats: EntrepriseHomonyme[] }) {
  return (
    <ul className="space-y-1">
      {resultats.map((e) => (
        <li key={e.siren} className="text-muted-foreground">
          — {e.nom} (SIREN {e.siren}
          {e.naf ? `, ${e.naf}${e.naf_libelle ? ` ${e.naf_libelle}` : ""}` : ""}
          {e.commune ? `, ${e.commune}` : ""})
        </li>
      ))}
    </ul>
  );
}
