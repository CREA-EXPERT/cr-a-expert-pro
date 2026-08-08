import { Sparkles } from "lucide-react";

export function AssistantBientot() {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-30">
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-muted-foreground shadow-[var(--shadow-card)] opacity-90"
      >
        <Sparkles className="size-4" strokeWidth={1.5} aria-hidden />
        Assistant IA — Bientôt disponible
      </button>
    </div>
  );
}
