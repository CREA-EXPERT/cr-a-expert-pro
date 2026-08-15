import { BANNIERE_TEST } from "@/lib/test-mode";
import { FlaskConical } from "lucide-react";

/** Bandeau permanent affiché sur toutes les pages d'un dossier de test. */
export function BanniereTest({ actif }: { actif?: boolean | null }) {
  if (!actif) return null;
  return (
    <div
      role="status"
      data-testid="banniere-test"
      className="flex items-center justify-center gap-2 bg-amber-300 px-4 py-2 text-center text-sm font-semibold tracking-wide text-amber-950"
    >
      <FlaskConical className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
      {BANNIERE_TEST}
    </div>
  );
}
