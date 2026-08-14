import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EncadrePliable } from "@/components/EncadrePliable";
import { GuideCorrection } from "@/components/GuideCorrection";
import type { Associe, Dossier } from "@/lib/documents";
import { horodatageFr, lireEvenements, type EvenementJournal } from "@/lib/journal";
import { extraireMeta, journaliserConformite, TYPE_BLOQUEE, TYPE_REUSSIE } from "@/lib/conformite";
import { notifierConformite } from "@/lib/notifications.functions";
import {
  alertesStatuts,
  champsManquantsStatuts,
  gabaritApplique,
  motifsRefusStatuts,
} from "@/lib/statuts-controles";

const LIBELLE_GABARIT: Record<string, string> = {
  SAS: "SAS / SASU",
  SARL: "SARL",
  EURL: "EURL (SARL à associé unique)",
  SCI: "Société civile immobilière",
};

const TYPES_JOURNAL = [TYPE_BLOQUEE, TYPE_REUSSIE];
/** Anti-spam : un blocage strictement identique n'est pas rejournalisé sous 5 minutes. */
const DELAI_ANTI_DOUBLON = 5 * 60 * 1000;
/** Anti-rafale : délai d'inactivité avant régénération automatique. */
const DEBOUNCE = 800;

/**
 * Aperçu du projet de statuts avant export : gabarit retenu, champs juridiques
 * manquants, alertes de conformité, journal de conformité et rendu du PDF.
 * L'aperçu se régénère automatiquement dès que le dossier devient générable.
 */
export function ApercuStatuts({ dossier, associes }: { dossier: Dossier; associes: Associe[] }) {
  const gabarit = gabaritApplique(dossier, associes);
  const manquants = champsManquantsStatuts(dossier, associes);
  const alertes = alertesStatuts(dossier, associes);
  const motifs = useMemo(() => motifsRefusStatuts(dossier, associes), [dossier, associes]);
  const bloque = motifs.length > 0;

  const [url, setUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [journal, setJournal] = useState<EvenementJournal[]>([]);
  const octets = useRef<Uint8Array | null>(null);
  const dernierBlocage = useRef<{ cle: string; le: number } | null>(null);
  const urlCourante = useRef<string | null>(null);

  useEffect(() => {
    let vivant = true;
    lireEvenements(dossier.id, TYPES_JOURNAL).then((e) => {
      if (vivant) setJournal(e);
    });
    return () => {
      vivant = false;
    };
  }, [dossier.id]);

  useEffect(() => {
    return () => {
      if (urlCourante.current) URL.revokeObjectURL(urlCourante.current);
    };
  }, []);

  /** Ajoute l'événement au journal affiché et le persiste au journal du dossier. */
  const consigner = useCallback(
    (type: string, message: string, motifPrincipal: string | null = null) => {
      const evenement = { type_event: type, message, created_at: new Date().toISOString() };
      setJournal((liste) => [evenement, ...liste].slice(0, 10));
      void journaliserConformite(dossier.id, type, message, gabarit);
      // Notification interne : refus, ou réussite faisant suite à un refus.
      const suiteARefus = journal.some((e) => e.type_event === TYPE_BLOQUEE);
      if (type === TYPE_BLOQUEE || (type === TYPE_REUSSIE && suiteARefus)) {
        void notifierConformite({
          data: { dossierId: dossier.id, typeEvent: type, motifPrincipal, message },
        }).catch(() => undefined);
      }
    },
    [dossier.id, gabarit, journal],
  );

  const consignerBlocage = useCallback(() => {
    const detail = motifs
      .map((m) => (m.etape ? `${m.texte} (étape « ${m.etape} »)` : m.texte))
      .join(" ; ");
    const precedent = dernierBlocage.current;
    if (precedent && precedent.cle === detail && Date.now() - precedent.le < DELAI_ANTI_DOUBLON)
      return;
    dernierBlocage.current = { cle: detail, le: Date.now() };
    consigner(
      TYPE_BLOQUEE,
      `Génération des statuts bloquée — ${motifs.length} point${
        motifs.length > 1 ? "s" : ""
      } à traiter : ${detail}.`,
      motifs[0]?.texte ?? null,
    );
  }, [motifs, consigner]);

  const generer = useCallback(async () => {
    if (bloque) {
      consignerBlocage();
      setErreur(
        "La génération est suspendue tant que les points listés ci-dessus ne sont pas traités.",
      );
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const { genererPdf } = await import("@/lib/pdf");
      const bytes = await genererPdf("statuts", dossier, associes, null);
      octets.current = bytes;
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const nouvelle = URL.createObjectURL(blob);
      if (urlCourante.current) URL.revokeObjectURL(urlCourante.current);
      urlCourante.current = nouvelle;
      setUrl(nouvelle);
      consigner(
        TYPE_REUSSIE,
        `Projet de statuts généré — gabarit ${LIBELLE_GABARIT[gabarit ?? ""] ?? gabarit}.`,
      );
    } catch (e) {
      octets.current = null;
      setErreur(e instanceof Error ? e.message : "Aperçu indisponible.");
      consignerBlocage();
    } finally {
      setEnCours(false);
    }
  }, [dossier, associes, bloque, gabarit, consigner, consignerBlocage]);

  const dernierGenerer = useRef(generer);
  dernierGenerer.current = generer;

  // Reprise automatique : dès que le dossier devient générable — ou que les
  // données changent alors qu'il l'est déjà — l'aperçu se régénère seul.
  const dernierBlocageJournal = useRef(consignerBlocage);
  dernierBlocageJournal.current = consignerBlocage;

  useEffect(() => {
    if (!gabarit) return;
    const minuteur = setTimeout(() => {
      if (bloque) dernierBlocageJournal.current();
      else void dernierGenerer.current();
    }, DEBOUNCE);
    return () => clearTimeout(minuteur);
  }, [dossier, associes, gabarit, bloque]);

  if (!gabarit) return null;

  return (
    <section
      data-testid="apercu-statuts"
      className="space-y-4 rounded-lg border border-border bg-surface p-5"
    >
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

      <GuideCorrection dossier={dossier} manquants={manquants} />

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

      <EncadrePliable titre="Journal de conformité" badge="Traçabilité">
        {journal.length === 0 ? (
          <p className="text-muted-foreground">
            Aucun événement pour l'instant. Les tentatives de génération, abouties ou bloquées,
            seront consignées ici.
          </p>
        ) : (
          <ul className="space-y-3">
            {journal.slice(0, 10).map((e, i) => (
              <li key={`${e.created_at}-${i}`} className="space-y-1">
                <p className="text-xs text-muted-foreground">{horodatageFr(e.created_at)}</p>
                <p className="text-justify">{extraireMeta(e.message).message}</p>
              </li>
            ))}
          </ul>
        )}
      </EncadrePliable>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={generer} disabled={bloque || enCours}>
          {enCours ? "Génération…" : url ? "Actualiser l'aperçu" : "Afficher l'aperçu"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!url}
          onClick={() =>
            void (async () => {
              if (!octets.current) return;
              const { telechargerPdf } = await import("@/lib/pdf");
              telechargerPdf(octets.current, `Statuts ${dossier.denomination ?? "projet"}`);
            })()
          }
        >
          Télécharger le projet
        </Button>
        {enCours && url && (
          <span className="text-sm text-muted-foreground">Actualisation de l'aperçu…</span>
        )}
      </div>

      {bloque && (
        <p className="text-sm text-muted-foreground">
          L'aperçu sera disponible dès que les points ci-dessus seront traités.
        </p>
      )}

      {erreur && (
        <p
          role="alert"
          className="rounded-md border border-border bg-background p-4 text-sm text-justify"
        >
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
