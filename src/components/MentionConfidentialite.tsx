import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/** Mention d'information RGPD affichée aux points de collecte. */
export function MentionConfidentialite({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Les informations recueillies sont traitées conformément à notre{" "}
      <Link to="/confidentialite" className="underline underline-offset-2">
        Politique de confidentialité
      </Link>
      .
    </p>
  );
}
