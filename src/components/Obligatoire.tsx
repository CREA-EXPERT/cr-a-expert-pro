/** Astérisque signalant une information obligatoire. */
export function Requis() {
  return (
    <span aria-hidden className="ml-0.5 font-medium text-destructive">
      *
    </span>
  );
}

/** Mention rappelant la signification de l'astérisque, en bas d'étape. */
export function MentionObligatoire({ className }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground ${className ?? ""}`} data-testid="mention-obligatoire">
      <span className="font-medium text-destructive">*</span> Information obligatoire.
    </p>
  );
}
