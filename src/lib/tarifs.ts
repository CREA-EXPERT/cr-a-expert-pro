import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isCivile, type Forme } from "./domain";

export type Tarif = {
  id: string;
  cle: string;
  libelle: string;
  montant_ht: number | null;
  montant_ttc: number | null;
};

export const tarifsQuery = {
  queryKey: ["params_tarifs"],
  queryFn: async (): Promise<Tarif[]> => {
    const { data, error } = await supabase
      .from("params_tarifs")
      .select("id, cle, libelle, montant_ht, montant_ttc")
      .order("cle");
    if (error) throw error;
    return (data ?? []) as Tarif[];
  },
};

export function useTarifs() {
  return useQuery(tarifsQuery);
}

export function tarifMap(tarifs: Tarif[] | undefined) {
  const m = new Map<string, Tarif>();
  (tarifs ?? []).forEach((t) => m.set(t.cle, t));
  return m;
}

export type CoutForme = {
  forme: Forme;
  annonceTtc: number;
  greffeTtc: number;
  benefTtc: number;
  greffeEtBenef: number;
  totalTtc: number;
};

export function coutParForme(tarifs: Tarif[] | undefined, forme: Forme): CoutForme {
  const m = tarifMap(tarifs);
  if (forme === "EI") {
    const greffeEi = m.get("greffe_EI")?.montant_ttc ?? 0;
    return {
      forme,
      annonceTtc: m.get("annonce_EI")?.montant_ttc ?? 0,
      greffeTtc: greffeEi,
      benefTtc: 0,
      greffeEtBenef: greffeEi,
      totalTtc: greffeEi,
    };
  }
  const annonceTtc = m.get(`annonce_${forme}`)?.montant_ttc ?? 0;
  const greffeTtc =
    m.get(isCivile(forme) ? "greffe_societe_civile" : "greffe_societe_commerciale")?.montant_ttc ?? 0;
  const benefTtc = m.get("benef_effectifs")?.montant_ttc ?? 0;
  return {
    forme,
    annonceTtc,
    greffeTtc,
    benefTtc,
    greffeEtBenef: greffeTtc + benefTtc,
    totalTtc: annonceTtc + greffeTtc + benefTtc,
  };
}

export function missionMensuelleHt(tarifs: Tarif[] | undefined) {
  return tarifMap(tarifs).get("mission_compta_mensuelle")?.montant_ht ?? 199;
}

export function prixRelectureHt(tarifs: Tarif[] | undefined) {
  return tarifMap(tarifs).get("relecture_cabinet")?.montant_ht ?? 149;
}

export function penaliteCreationHt(tarifs: Tarif[] | undefined) {
  return tarifMap(tarifs).get("penalite_creation")?.montant_ht ?? 399;
}

/** Bornes HT de l'annonce légale sur les formes sociétaires (l'EI en est exclue). */
export function bornesAnnonceHt(tarifs: Tarif[] | undefined) {
  const valeurs = (tarifs ?? [])
    .filter((t) => t.cle.startsWith("annonce_") && t.cle !== "annonce_EI")
    .map((t) => Number(t.montant_ht ?? 0))
    .filter((n) => n > 0);
  if (valeurs.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...valeurs), max: Math.max(...valeurs) };
}

/** Greffe + bénéficiaires effectifs pour une société commerciale (montant réglementé). */
export function greffeEtBenefSociete(tarifs: Tarif[] | undefined) {
  const m = tarifMap(tarifs);
  return (m.get("greffe_societe_commerciale")?.montant_ttc ?? 0) + (m.get("benef_effectifs")?.montant_ttc ?? 0);
}

export function greffeEi(tarifs: Tarif[] | undefined) {
  return tarifMap(tarifs).get("greffe_EI")?.montant_ttc ?? 0;
}

