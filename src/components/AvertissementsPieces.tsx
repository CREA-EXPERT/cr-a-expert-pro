import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EncadrePliable } from "@/components/EncadrePliable";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const TEXTE_AVERTISSEMENT_REJET =
  "En cas de rejet du dossier par le greffe pour pièce non conforme, les frais de greffe doivent être payés à nouveau, et les frais d'annonce légale peuvent également devoir être réengagés. Vérifiez soigneusement chaque document avant transmission.";

/** Avertissement financier permanent : jamais replié, jamais masqué. */
export function AvertissementRejet({ className }: { className?: string }) {
  return (
    <Alert
      className={cn("border-warning/50 bg-warning/10 text-foreground", className)}
      aria-live="polite"
    >
      <AlertTriangle className="size-4 text-warning" strokeWidth={1.5} aria-hidden />
      <AlertTitle>Un rejet du greffe se paie deux fois</AlertTitle>
      <AlertDescription className="max-w-prose leading-relaxed">
        {TEXTE_AVERTISSEMENT_REJET}
      </AlertDescription>
    </Alert>
  );
}

/** Mention manuscrite obligatoire sur les copies de pièces d'identité. */
export function BandeauMentionManuscrite({ className }: { className?: string }) {
  return (
    <Alert className={cn("border-warning/60 bg-warning/10 text-foreground", className)}>
      <AlertTriangle className="size-4 text-warning" strokeWidth={1.5} aria-hidden />
      <AlertTitle>OBLIGATOIRE : mention manuscrite sur la copie</AlertTitle>
      <AlertDescription className="max-w-prose leading-relaxed">
        Recopiez <strong>à la main</strong> sur la copie de votre pièce d'identité la mention
        «&nbsp;J'atteste sur l'honneur que la présente copie est certifiée conforme à
        l'original&nbsp;», puis <strong>datez</strong> et <strong>signez</strong> à la main. Sans
        cette mention manuscrite, le greffe rejette le dossier.
      </AlertDescription>
    </Alert>
  );
}

/** Rappel de validité de la pièce d'identité, affiché en colonne « ce qui est demandé ». */
export function RappelValidite() {
  return (
    <p className="max-w-prose text-sm leading-relaxed text-warning">
      La pièce doit être <strong>en cours de validité</strong> à la date du dépôt. Une pièce expirée
      entraîne le rejet du dossier.
    </p>
  );
}

/** Liste des justificatifs de domicile admis, repliée par défaut. */
export function JustificatifsDomicileAdmis() {
  return (
    <EncadrePliable titre="Quels justificatifs sont acceptés ?" badge={null}>
      <ul className="list-disc space-y-1 pl-5">
        <li>facture d'électricité ou de gaz de moins de 3 mois&nbsp;;</li>
        <li>facture d'eau de moins de 3 mois&nbsp;;</li>
        <li>facture de téléphone fixe, mobile ou d'accès internet de moins de 3 mois&nbsp;;</li>
        <li>avis d'imposition ou avis de taxe foncière (année en cours)&nbsp;;</li>
        <li>quittance de loyer émise par un bailleur professionnel de moins de 3 mois&nbsp;;</li>
        <li>attestation d'assurance habitation de moins de 3 mois.</li>
      </ul>
      <p className="text-destructive/90">
        Ne sont PAS acceptés : factures d'achat, relevés bancaires, courriers publicitaires,
        échéanciers.
      </p>
    </EncadrePliable>
  );
}
