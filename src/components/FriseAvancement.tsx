import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { aRedeposer, normaliserStatut } from "@/lib/pieces";
import type { DocumentRow, Dossier } from "@/lib/documents";
import type { SignatureRow } from "@/lib/signatures";

const ETAPES = [
  "Saisie du dossier",
  "Pièces justificatives",
  "Signature des documents",
  "Transmission au greffe",
  "Immatriculation (SIREN)",
] as const;

/** Index de l'étape courante, déduit uniquement des données du dossier. */
export function etapeFrise(dossier: Dossier, docs: DocumentRow[], signatures: SignatureRow[]) {
  if (dossier.siren || dossier.statut === "immatricule") return 4;
  if (dossier.statut === "depose" || dossier.statut === "pret_au_depot") return 3;
  const signaturesRestantes = signatures.filter((s) => s.statut !== "signe").length;
  if (signatures.length > 0 && signaturesRestantes > 0) return 2;
  if (dossier.statut === "brouillon") return 0;
  const piecesRestantes = docs.filter(
    (d) =>
      d.origine === "a_fournir" &&
      d.obligatoire &&
      (!d.fichier_url || aRedeposer(normaliserStatut(d.statut_document))),
  ).length;
  if (piecesRestantes > 0) return 1;
  if (signatures.length > 0 && signaturesRestantes === 0) return 3;
  return 1;
}

/** Phrase indiquant la prochaine action attendue de l'utilisateur. */
export function prochaineActionClient(
  dossier: Dossier,
  docs: DocumentRow[],
  signatures: SignatureRow[],
) {
  if (dossier.statut === "brouillon") return "Terminez la saisie de votre dossier en ligne.";
  const manquantes = docs.filter(
    (d) =>
      d.origine === "a_fournir" &&
      d.obligatoire &&
      (!d.fichier_url || aRedeposer(normaliserStatut(d.statut_document))),
  ).length;
  if (manquantes > 0)
    return `${manquantes} pièce${manquantes > 1 ? "s restent" : " reste"} à déposer ou à corriger.`;
  const aSigner = signatures.filter((s) => s.statut === "envoye" || s.statut === "a_envoyer").length;
  if (aSigner > 0)
    return `${aSigner} document${aSigner > 1 ? "s sont" : " est"} en attente de votre signature.`;
  return "Aucune action de votre part — nous traitons votre dossier.";
}

export function FriseAvancement({
  dossier,
  docs,
  signatures,
  className,
}: {
  dossier: Dossier;
  docs: DocumentRow[];
  signatures: SignatureRow[];
  className?: string;
}) {
  const courante = etapeFrise(dossier, docs, signatures);
  const message = prochaineActionClient(dossier, docs, signatures);

  return (
    <section
      aria-label="Avancement de votre dossier"
      className={cn("rounded-lg border border-border bg-surface p-6", className)}
    >
      {/* Desktop : frise complète */}
      <ol className="hidden gap-2 sm:grid sm:grid-cols-5">
        {ETAPES.map((etape, i) => {
          const passee = i < courante;
          const active = i === courante;
          return (
            <li
              key={etape}
              aria-current={active ? "step" : undefined}
              className={cn(
                "rounded-md border p-3 text-xs leading-snug",
                active && "border-accent bg-accent/10 font-medium",
                passee && "border-border text-muted-foreground",
                !active && !passee && "border-dashed border-border text-muted-foreground/70",
              )}
            >
              <span className="flex items-center gap-1.5">
                {passee && <Check className="size-3.5 text-success" strokeWidth={2} aria-hidden />}
                <span>{etape}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {/* Mobile : étape courante condensée */}
      <div className="sm:hidden">
        <p className="text-xs text-muted-foreground">Étape {courante + 1}/5</p>
        <p className="mt-1 font-medium">{ETAPES[courante]}</p>
      </div>

      <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">{message}</p>
    </section>
  );
}
