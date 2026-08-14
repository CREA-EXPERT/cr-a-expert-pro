/**
 * Point d'entrée unique des contrôles préalables à la génération des statuts,
 * toutes formes confondues : champs juridiques manquants, alertes de conformité
 * et bascule automatique EURL → SARL.
 */

import type { Associe, Dossier } from "./documents";
import { controlerChronologie, revuesHumaines } from "./documents";
import { isEI, isSas } from "./domain";
import { champsManquantsStatutsSas, type ChampManquant } from "./statuts-sas";
import { champsManquantsStatutsSarl, isSarl, associesEffectifs } from "./statuts-sarl";
import {
  basculeSarlRequise,
  champsManquantsStatutsEurl,
  isEurl,
  MESSAGE_BASCULE_SARL,
} from "./statuts-eurl";
import { avertissementsSci, champsManquantsStatutsSci, isSciForme } from "./statuts-sci";
import type { Gabarit } from "./statuts-clauses";

/** Gabarit effectivement appliqué, bascule EURL → SARL comprise. */
export function gabaritApplique(d: Dossier, associes: Associe[]): Gabarit | null {
  const f = d.forme_juridique ?? "";
  if (isEI(f)) return null;
  if (isSas(f)) return "SAS";
  if (isSciForme(f)) return "SCI";
  if (isEurl(f)) return basculeSarlRequise(d, associes) ? "SARL" : "EURL";
  if (isSarl(f)) return associesEffectifs(d, associes).length > 1 ? "SARL" : "EURL";
  return null;
}

/** Champs juridiques requis mais non renseignés, pour le gabarit applicable. */
export function champsManquantsStatuts(d: Dossier, associes: Associe[]): ChampManquant[] {
  switch (gabaritApplique(d, associes)) {
    case "SAS":
      return champsManquantsStatutsSas(d, associes);
    case "SARL":
      return champsManquantsStatutsSarl(d, associes);
    case "EURL":
      return champsManquantsStatutsEurl(d, associes);
    case "SCI":
      return champsManquantsStatutsSci(d, associes);
    default:
      return [];
  }
}

export type AlertesStatuts = {
  /** Empêchent la génération du document. */
  bloquantes: string[];
  /** N'empêchent pas la génération mais imposent une revue humaine. */
  revues: string[];
};

/** Alertes de conformité affichées au client avant export. */
export function alertesStatuts(d: Dossier, associes: Associe[]): AlertesStatuts {
  const gabarit = gabaritApplique(d, associes);
  const bloquantes: string[] = [];
  const revues: string[] = [];
  if (!gabarit) return { bloquantes, revues };

  if (d.apport_nature)
    bloquantes.push(
      "Apport en nature : l'évaluation relève d'un commissaire aux apports ou d'une dispense expresse. Le cabinet doit reprendre le dossier avant génération.",
    );

  const chrono = controlerChronologie(d, associes);
  bloquantes.push(...chrono.erreurs);
  revues.push(...chrono.avertissements);
  revues.push(...revuesHumaines(d, associes));

  if (isEurl(d.forme_juridique) && basculeSarlRequise(d, associes)) revues.push(MESSAGE_BASCULE_SARL);
  if (gabarit === "SCI") revues.push(...avertissementsSci(d, associes));

  return {
    bloquantes: [...new Set(bloquantes)],
    revues: [...new Set(revues)],
  };
}

/** Les statuts peuvent-ils être générés en l'état ? */
export function statutsGenerables(d: Dossier, associes: Associe[]) {
  return (
    gabaritApplique(d, associes) !== null &&
    champsManquantsStatuts(d, associes).length === 0 &&
    alertesStatuts(d, associes).bloquantes.length === 0
  );
}

export type MotifRefus = { texte: string; etape?: string };

/**
 * Motifs de refus de génération des statuts, tous confondus : champs juridiques
 * manquants (avec l'étape du parcours) et alertes bloquantes de conformité.
 */
export function motifsRefusStatuts(d: Dossier, associes: Associe[]): MotifRefus[] {
  if (gabaritApplique(d, associes) === null) return [];
  return [
    ...champsManquantsStatuts(d, associes).map((m) => ({ texte: m.champ, etape: m.etape })),
    ...alertesStatuts(d, associes).bloquantes.map((a) => ({ texte: a })),
  ];
}

/** Message d'erreur listant chaque motif de refus, formulé pour le client. */
export function messageRefusStatuts(motifs: MotifRefus[]) {
  return `Statuts non générés — ${motifs.length} point${motifs.length > 1 ? "s" : ""} à traiter : ${motifs
    .map((m) => (m.etape ? `${m.texte} (étape « ${m.etape} »)` : m.texte))
    .join(" ; ")}.`;
}
