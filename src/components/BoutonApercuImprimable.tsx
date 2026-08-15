import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Ouvre l'aperçu d'impression du navigateur (export PDF possible depuis la
 * boîte de dialogue). La feuille de style `@media print` conserve la
 * justification du texte et le bloc affiché sous le bouton de réservation.
 */
export function BoutonApercuImprimable({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-print="hide"
      data-testid="apercu-imprimable"
      className={className}
      onClick={() => window.print()}
    >
      <Printer strokeWidth={1.5} aria-hidden />
      Aperçu imprimable (PDF)
    </Button>
  );
}
