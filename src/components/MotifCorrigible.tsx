import { Link } from "@tanstack/react-router";
import { numeroEtape, TITRES, CLES_EI, CLES_SOCIETE } from "@/lib/etapes";
import { isEI } from "@/lib/domain";
import type { Dossier } from "@/lib/documents";
import type { MotifRefus } from "@/lib/statuts-controles";

/**
 * Motif de blocage affiché avec, lorsque l'étape est identifiable, un lien
 * direct vers l'étape du parcours où le corriger.
 */
export function MotifCorrigible({
  texte,
  dossier,
  motifs,
}: {
  texte: string;
  dossier: Dossier;
  motifs: MotifRefus[];
}) {
  const ei = isEI(dossier.forme_juridique ?? "");
  const cles = ei ? CLES_EI : CLES_SOCIETE;
  const correspondance = motifs.find((m) => texte.includes(m.texte) && m.etape);
  const numero = correspondance?.etape ? numeroEtape(correspondance.etape, ei) : null;
  const titre = numero ? TITRES[cles[numero - 1]!] : null;

  return (
    <span className="text-justify">
      {texte}
      {numero && titre && (
        <>
          {" — "}
          <Link to="/creation" search={{ etape: numero }} className="underline underline-offset-2">
            corriger à l'étape « {titre} »
          </Link>
        </>
      )}
    </span>
  );
}
