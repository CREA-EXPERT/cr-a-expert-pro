import { supabase } from "@/integrations/supabase/client";

/**
 * État replié/déplié des encadrés pédagogiques.
 * Le navigateur garde une copie locale pour un affichage immédiat ; la base
 * conserve la référence, afin de retrouver la même configuration sur tous les
 * appareils de la personne connectée.
 */

const PREFIXE = "crea-encadre:";

let cache: Record<string, boolean> = {};
let chargement: Promise<void> | null = null;
const abonnes = new Set<() => void>();

function notifier() {
  for (const f of abonnes) f();
}

/** Abonnement aux changements de préférences ; renvoie la fonction de retrait. */
export function sabonnerPreferences(f: () => void) {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

function lireLocal(cle: string): boolean | null {
  try {
    const v = window.localStorage.getItem(PREFIXE + cle);
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null;
  }
}

function ecrireLocal(cle: string, ouvert: boolean) {
  try {
    window.localStorage.setItem(PREFIXE + cle, ouvert ? "1" : "0");
  } catch {
    /* stockage indisponible : l'encadré reste utilisable */
  }
}

/** Valeur connue pour un encadré, sinon `null`. */
export function lirePreference(cle: string): boolean | null {
  if (cle in cache) return cache[cle] ?? null;
  return lireLocal(cle);
}

/** Charge une seule fois les préférences enregistrées en base. */
export function chargerPreferences(): Promise<void> {
  if (chargement) return chargement;
  chargement = (async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return;
    const { data } = await supabase.from("preferences_encadres").select("cle, ouvert");
    if (!data) return;
    let change = false;
    for (const p of data) {
      if (cache[p.cle] !== p.ouvert) {
        cache[p.cle] = p.ouvert;
        ecrireLocal(p.cle, p.ouvert);
        change = true;
      }
    }
    if (change) notifier();
  })().catch(() => {
    /* hors ligne ou non connecté : la copie locale suffit */
  });
  return chargement;
}

/** Enregistre l'état d'un encadré localement puis en base si possible. */
export async function enregistrerPreference(cle: string, ouvert: boolean) {
  cache[cle] = ouvert;
  ecrireLocal(cle, ouvert);
  notifier();
  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id;
    if (!userId) return;
    await supabase
      .from("preferences_encadres")
      .upsert({ user_id: userId, cle, ouvert }, { onConflict: "user_id,cle" });
  } catch {
    /* la préférence reste appliquée localement */
  }
}

/** Réinitialise le cache (tests). */
export function reinitialiserPreferences() {
  cache = {};
  chargement = null;
}
