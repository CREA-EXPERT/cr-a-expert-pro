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
