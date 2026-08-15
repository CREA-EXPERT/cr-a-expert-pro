import { useEffect, useRef, useState } from "react";

const SCRIPT_SRC = "https://assets.calendly.com/assets/external/widget.js";
const URL_CALENDLY = "https://calendly.com/d/d3vt-kj8-pqf";

/**
 * Widget de prise de rendez-vous Calendly (entretien payant avec un
 * expert-comptable). Le script externe n'est chargé qu'une fois, côté
 * navigateur, après hydratation.
 */
export function CalendlyRdv({ hauteur = 700 }: { hauteur?: number }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const [monte, setMonte] = useState(false);

  useEffect(() => {
    setMonte(true);
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  return (
    <section aria-label="Prise de rendez-vous avec un expert-comptable">
      <div
        ref={conteneur}
        className="calendly-inline-widget rounded-lg border border-border bg-surface"
        data-url={URL_CALENDLY}
        style={{ minWidth: 320, height: hauteur }}
      />
      {!monte && (
        <p className="mt-2 text-sm text-muted-foreground">Chargement du calendrier…</p>
      )}
      <p className="mt-3 text-sm text-muted-foreground">
        Si le calendrier ne s'affiche pas,{" "}
        <a
          href={URL_CALENDLY}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          ouvrez la page de réservation dans un nouvel onglet
        </a>
        .
      </p>
    </section>
  );
}
