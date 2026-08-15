import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BOUTON_CONSULTATION,
  LIBELLE_PRIX_CONSULTATION,
  MENTION_CONSULTATION,
  TEXTE_CONSULTATION,
  TITRE_CONSULTATION,
  URL_CALENDLY_CONSULTATION,
} from "@/lib/contact";

type Props = {
  /** `card` : encart complet. `inline` : bouton et une ligne de contexte. */
  variante?: "card" | "inline";
  className?: string;
  taille?: "default" | "sm" | "lg";
};

function BoutonReserver({ taille = "default" }: { taille?: "default" | "sm" | "lg" }) {
  return (
    <Button asChild size={taille}>
      <a
        href={URL_CALENDLY_CONSULTATION}
        target="_blank"
        rel="noreferrer"
        data-testid="bouton-consultation"
      >
        <CalendarCheck strokeWidth={1.5} aria-hidden />
        {BOUTON_CONSULTATION}
      </a>
    </Button>
  );
}

/**
 * Consultation payante d'une heure avec un expert-comptable du cabinet.
 * Réservation et paiement se font sur la page externe de réservation.
 */
export function ConsultationExpertCard({ variante = "card", className, taille }: Props) {
  if (variante === "inline") {
    return (
      <div className={className}>
        <BoutonReserver taille={taille ?? "sm"} />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Consultation d'une heure avec un expert-comptable du cabinet —{" "}
          {LIBELLE_PRIX_CONSULTATION}. Paiement à la réservation.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Consultation avec un expert-comptable"
      className={`rounded-lg border border-border bg-surface p-6 ${className ?? ""}`}
    >
      <h2 className="font-serif text-xl">{TITRE_CONSULTATION}</h2>
      <p className="mt-3 text-base leading-relaxed text-justify">{TEXTE_CONSULTATION}</p>
      <p className="mt-4 text-base font-medium">{LIBELLE_PRIX_CONSULTATION}</p>
      <div className="mt-4">
        <BoutonReserver taille={taille ?? "lg"} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{MENTION_CONSULTATION}</p>
    </section>
  );
}
