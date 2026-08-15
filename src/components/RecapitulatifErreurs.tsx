import { AlertTriangle } from "lucide-react";

/**
 * Récapitulatif, en tête de formulaire, des points bloquants de l'étape en
 * cours : contrat de mariage incohérent, champs obligatoires manquants, etc.
 * Annoncé aux lecteurs d'écran et focalisable pour un retour d'erreur clair.
 */
export function RecapitulatifErreurs({ erreurs }: { erreurs: Record<string, string> }) {
  const lignes = Object.entries(erreurs).filter(([, v]) => Boolean(v));
  if (lignes.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      data-testid="recap-erreurs"
      className="mt-6 rounded-lg border border-destructive/50 bg-destructive/5 p-4"
    >
      <p className="flex items-center gap-2 text-sm font-medium text-destructive">
        <AlertTriangle aria-hidden strokeWidth={1.5} className="size-4 shrink-0" />
        {lignes.length === 1
          ? "Un point doit être corrigé avant de continuer"
          : `${lignes.length} points doivent être corrigés avant de continuer`}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-relaxed">
        {lignes.map(([cle, message]) => (
          <li key={cle}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
