import { useEffect, useId, useState, type ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import {
  chargerPreferences,
  enregistrerPreference,
  lirePreference,
  sabonnerPreferences,
} from "@/lib/preferences-encadres";

/** Clé stable dérivée du titre, ou de l'identifiant fourni. */
function cleMemoire(id: string | undefined, titre: string) {
  return id ?? titre.toLowerCase().replace(/\s+/g, "-").slice(0, 80);
}

/**
 * Encadré replié par défaut : l'utilisateur choisit de lire.
 * En-tête entièrement cliquable, navigable au clavier, avec aria-expanded/controls.
 * L'état replié/déplié est conservé pour la personne connectée, sur tous ses appareils.
 */
export function EncadrePliable({
  titre,
  badge = null,
  ton = "neutre",
  defaultOuvert = false,
  memoireId,
  className,
  children,
}: {
  titre: string;
  badge?: string | null;
  ton?: "neutre" | "accent";
  defaultOuvert?: boolean;
  /** Identifiant de mémorisation ; par défaut dérivé du titre. */
  memoireId?: string;
  className?: string;
  children: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(defaultOuvert);
  const idContenu = useId();
  const cle = cleMemoire(memoireId, titre);

  // Lecture après hydratation : évite toute divergence serveur / navigateur.
  useEffect(() => {
    const appliquer = () => {
      const memorise = lirePreference(cle);
      if (memorise !== null) setOuvert(memorise);
    };
    appliquer();
    const retirer = sabonnerPreferences(appliquer);
    void chargerPreferences().then(appliquer);
    return () => {
      retirer();
    };
  }, [cle]);

  function changer(v: boolean) {
    setOuvert(v);
    void enregistrerPreference(cle, v);
  }


  return (
    <Collapsible
      open={ouvert}
      onOpenChange={changer}
      className={cn(
        "rounded-lg border bg-muted/40",
        ton === "accent" ? "border-accent/40 bg-accent/8" : "border-border",
        className,
      )}
    >
      <CollapsibleTrigger
        aria-expanded={ouvert}
        aria-controls={idContenu}
        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronDown
          aria-hidden
          strokeWidth={1.5}
          className={cn("size-4 shrink-0 transition-transform duration-200", ouvert && "rotate-180")}
        />
        <span className="min-w-0 flex-1 text-sm font-medium">{titre}</span>
        {badge && (
          <span className="hidden shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground sm:inline">
            {badge}
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent
        id={idContenu}
        className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
      >
        <div className="max-w-prose space-y-2 px-4 pb-4 text-sm leading-relaxed text-justify">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
