import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Associe, Dossier } from "@/lib/documents";
import { genererPdf, telechargerPdf } from "@/lib/pdf";
import {
  alertesStatuts,
  champsManquantsStatuts,
  gabaritApplique,
} from "@/lib/statuts-controles";

const LIBELLE_GABARIT: Record<string, string> = {
  SAS: "SAS / SASU",
  SARL: "SARL",
  EURL: "EURL (SARL à associé unique)",
  SCI: "Société civile immobilière",
};

/**
 * Aperçu du projet de statuts avant export : gabarit retenu, champs juridiques
 * manquants, alertes de conformité et rendu du PDF lui-même.
 */
export function ApercuStatuts({ dossier, associes }: { dossier: Dossier; associes: Associe[] }) {
  const gabarit = gabaritApplique(dossier, associes);
  const manquants = champsManquantsStatuts(dossier, associes);
  const alertes = alertesStatuts(dossier, associes);
  const bloque = manquants.length > 0 || alertes.bloquantes.length > 0;

  const [url, setUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const octets = useRef<Uint8Array | null>(null);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const generer = useCallback(async () => {
    setEnCours(true);
    setErreur(null);
    try {
      const bytes = await genererPdf("statuts", dossier, associes, null);
      octets.current = bytes;
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setUrl((ancien) => {
        if (ancien) URL.revokeObjectURL(ancien);
        return URL.createObjectURL(blob);
      });
    } catch (e) {
      octets.current = null;
      setUrl((ancien) => {
        if (ancien) URL.revokeObjectURL(ancien);
        return null;
      });
      setErreur(e instanceof Error ? e.message : "Aperçu indisponible.");
    } finally {
      setEnCours(false);
    }
  }, [dossier, associes]);

  if (!gabarit) return null;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-serif text-xl">Aperçu de vos statuts</h3>
        <Badge variant="secondary">Gabarit {LIBELLE_GABARIT[gabarit]}</Badge>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground text-justify">
        Ce projet de statuts est établi à partir de vos réponses. Il porte le filigrane « PROJET »
        tant qu'il n'a pas été validé. Information générale — ne constitue pas un conseil.
      </p>

      {manquants.length > 0 && (
        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-sm font-medium">
            Informations juridiques manquantes ({manquants.length})
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            La génération est bloquée tant que ces éléments ne sont pas renseignés.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {manquants.map((m, i) => (
              <li key={`${m.champ}-${i}`} className="flex flex-wrap items-baseline gap-x-2">
                <span>{m.champ}</span>
                <span className="text-muted-foreground">— étape « {m.etape} »</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {alertes.bloquantes.length > 0 && (
        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-sm font-medium">Points bloquants de conformité</p>
          <ul className="mt-3 space-y-2 text-sm">
            {alertes.bloquantes.map((a, i) => (
              <li key={i} className="text-justify">
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {alertes.revues.length > 0 && (
        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-sm font-medium">Points soumis à la revue d'un professionnel</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {alertes.revues.map((a, i) => (
              <li key={i} className="text-justify">
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={generer} disabled={bloque || enCours}>
          {enCours ? "Génération…" : url ? "Actualiser l'aperçu" : "Afficher l'aperçu"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!url}
          onClick={() =>
            octets.current &&
            telechargerPdf(octets.current, `Statuts ${dossier.denomination ?? "projet"}`)
          }
        >
          Télécharger le projet
        </Button>
      </div>

      {bloque && (
        <p className="text-sm text-muted-foreground">
          L'aperçu sera disponible dès que les points ci-dessus seront traités.
        </p>
      )}

      {erreur && (
        <p className="rounded-md border border-border bg-background p-4 text-sm text-justify">
          {erreur}
        </p>
      )}

      {url && (
        <div className="overflow-hidden rounded-md border border-border bg-background">
          <object
            data={url}
            type="application/pdf"
            aria-label="Aperçu du projet de statuts"
            className="h-[26rem] w-full sm:h-[40rem]"
          >
            <p className="p-4 text-sm">
              L'aperçu intégré n'est pas pris en charge par votre navigateur.{" "}
              <a href={url} target="_blank" rel="noreferrer" className="underline">
                Ouvrir le projet de statuts
              </a>
              .
            </p>
          </object>
        </div>
      )}
    </section>
  );
}
