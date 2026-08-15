import { useEffect } from "react";
import { CalendarCheck, Check, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { journaliser } from "@/lib/journal";
import {
  CONSULTATION_BOUTON,
  CONSULTATION_BOUTON_ARIA,
  CONSULTATION_DUREE,
  CONSULTATION_ENGAGEMENT,
  CONSULTATION_GARANTIE,
  CONSULTATION_MENTION,
  CONSULTATION_PRIX,
  CONSULTATION_REASSURANCE,
  CONSULTATION_SOUS_BOUTON,
  CONSULTATION_TEXTES_VERSION,
  CONSULTATION_TITRE,
  URL_CALENDLY_CONSULTATION,
} from "@/lib/consultation-textes";

type Props = {
  /** `card` : encart complet. `inline` : bouton et une ligne de contexte. */
  variante?: "card" | "inline";
  className?: string;
  taille?: "default" | "sm" | "lg";
  /** Dossier auquel rattacher la trace d'affichage (facultatif). */
  dossierId?: string | null;
};

const ICONES = [Clock, Check, RotateCcw] as const;

function BoutonReserver({ taille = "default" }: { taille?: "default" | "sm" | "lg" }) {
  return (
    <Button asChild size={taille}>
      <a
        href={URL_CALENDLY_CONSULTATION}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={CONSULTATION_BOUTON_ARIA}
        data-testid="bouton-consultation"
      >
        <CalendarCheck strokeWidth={1.5} aria-hidden />
        {CONSULTATION_BOUTON}
      </a>
    </Button>
  );
}

function Reassurance({ className }: { className?: string }) {
  return (
    <ul data-testid="consultation-reassurance" className={`space-y-1.5 ${className ?? ""}`}>
      {CONSULTATION_REASSURANCE.map((point, i) => {
        const Icone = ICONES[i] ?? Check;
        return (
          <li key={point.cle} className="flex items-start gap-2 text-sm leading-relaxed">
            <Icone className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            <span>{point.texte}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Consultation payante d'1 heure (durée indicative) avec un expert-comptable
 * du cabinet. Réservation et paiement se font sur la page externe.
 */
export function ConsultationExpertCard({ variante = "card", className, taille, dossierId }: Props) {
  useEffect(() => {
    if (!dossierId) return;
    void journaliser(
      dossierId,
      "consultation_affichee",
      `Carte consultation affichée — textes version ${CONSULTATION_TEXTES_VERSION}.`,
    );
  }, [dossierId]);

  if (variante === "inline") {
    return (
      <div className={className} data-textes-version={CONSULTATION_TEXTES_VERSION}>
        <BoutonReserver taille={taille ?? "sm"} />
        <p className="mt-3 text-sm leading-relaxed text-justify text-muted-foreground">
          {CONSULTATION_DUREE} {CONSULTATION_PRIX}.
        </p>
        <Reassurance className="mt-2" />
      </div>
    );
  }

  return (
    <section
      aria-label="Consultation avec un expert-comptable"
      data-textes-version={CONSULTATION_TEXTES_VERSION}
      className={`rounded-lg border border-border bg-surface p-6 ${className ?? ""}`}
    >
      <h2 className="font-serif text-xl">{CONSULTATION_TITRE}</h2>
      <div className="mt-4">
        <BoutonReserver taille={taille ?? "lg"} />
      </div>
      <p className="mt-4 text-base leading-relaxed text-justify">
        {CONSULTATION_INTRO} {CONSULTATION_DUREE} {CONSULTATION_CANAL}
      </p>
      <p className="mt-3 text-base leading-relaxed text-justify">{CONSULTATION_ENGAGEMENT}</p>
      <p className="mt-3 text-base leading-relaxed text-justify">{CONSULTATION_GARANTIE}</p>
      <p className="mt-4 text-base font-medium" data-testid="consultation-prix">
        {CONSULTATION_PRIX}
      </p>
      <Reassurance className="mt-4" />
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{CONSULTATION_MENTION}</p>
    </section>
  );
}
