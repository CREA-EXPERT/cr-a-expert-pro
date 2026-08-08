import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { NAF, type NafItem } from "@/lib/naf";
import { cn } from "@/lib/utils";

/** Sélecteur du code d'activité NAF (nomenclature INSEE complète, 732 sous-classes). */
export function NafSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (item: NafItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const courant = useMemo(() => NAF.find((n) => n.code === value) ?? null, [value]);

  const resultats = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t
      ? NAF.filter(
          (n) => n.label.toLowerCase().includes(t) || n.code.toLowerCase().includes(t.replace(/\s/g, "")),
        )
      : NAF;
    return base.slice(0, 120);
  }, [q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto w-full justify-between whitespace-normal py-2.5 text-left font-normal"
        >
          <span className={cn(!courant && "text-muted-foreground")}>
            {courant ? `${courant.code} — ${courant.label}` : "Rechercher votre activité (code NAF)"}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" strokeWidth={1.5} aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(38rem,90vw)] p-0" align="start">
        <div className="relative border-b border-border">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden
          />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Coiffure, développement, transport, 62.01Z…"
            className="border-0 pl-9 shadow-none focus-visible:ring-0"
            aria-label="Rechercher une activité"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto py-1">
          {resultats.length === 0 && (
            <li className="px-3 py-4 text-sm text-muted-foreground">
              Aucune activité ne correspond à votre recherche.
            </li>
          )}
          {resultats.map((n) => (
            <li key={n.code}>
              <button
                type="button"
                onClick={() => {
                  onChange(n);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <Check
                  className={cn("mt-0.5 size-4 shrink-0", value === n.code ? "opacity-100 text-accent" : "opacity-0")}
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span>
                  <span className="font-medium">{n.code}</span> — {n.label}
                  <span className="mt-0.5 block text-xs text-muted-foreground">{n.section}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {resultats.length === 120 && (
          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            120 premiers résultats affichés — affinez votre recherche.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
