import { Info } from "lucide-react";
import { DISCLAIMER } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-foreground",
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.5} aria-hidden />
      <span>{DISCLAIMER}</span>
    </p>
  );
}
