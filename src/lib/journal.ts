/**
 * Journal d'événements du dossier : écriture et lecture de la table existante
 * `events_dossier` (insertion seule). Aucune nouvelle table n'est créée.
 */

import { supabase } from "@/integrations/supabase/client";

export type EvenementJournal = {
  type_event: string;
  message: string;
  created_at: string;
};

/** Écrit une ligne au journal du dossier. L'échec ne bloque jamais le parcours. */
export async function journaliser(dossierId: string, type: string, message: string) {
  try {
    await supabase
      .from("events_dossier")
      .insert({ dossier_id: dossierId, type_event: type, message });
  } catch {
    /* le journal est un confort de traçabilité, jamais un point de blocage */
  }
}

/** Derniers événements du dossier, du plus récent au plus ancien. */
export async function lireEvenements(
  dossierId: string,
  types: string[],
  limite = 10,
): Promise<EvenementJournal[]> {
  try {
    const { data } = await supabase
      .from("events_dossier")
      .select("type_event, message, created_at")
      .eq("dossier_id", dossierId)
      .in("type_event", types)
      .order("created_at", { ascending: false })
      .limit(limite);
    return (data ?? []) as EvenementJournal[];
  } catch {
    return [];
  }
}

/** Horodatage lisible en français : « 14 août 2026 à 15:42 ». */
export function horodatageFr(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
