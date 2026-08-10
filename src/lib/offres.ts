import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Offre = Tables<"offres_creation">;
export type ParametresTarifs = Tables<"parametres_tarifs">;

export type CodeOffre = "creation_seule" | "creation_ec";

export const offresQuery = {
  queryKey: ["offres_creation"],
  queryFn: async (): Promise<Offre[]> => {
    const { data, error } = await supabase
      .from("offres_creation")
      .select("*")
      .eq("actif", true)
      .order("ordre");
    if (error) throw error;
    return data ?? [];
  },
};

export const parametresQuery = {
  queryKey: ["parametres_tarifs"],
  queryFn: async (): Promise<ParametresTarifs | null> => {
    const { data, error } = await supabase.from("parametres_tarifs").select("*").limit(1).maybeSingle();
    if (error) throw error;
    return data;
  },
};

export function useOffres() {
  return useQuery(offresQuery);
}

export function useParametresTarifs() {
  return useQuery(parametresQuery);
}

/** Prix HT de l'offre selon que la comptabilité est confiée au cabinet ou non. */
export function prixOffreHt(offre: Offre | undefined, avecCompta: boolean): number {
  if (!offre) return 0;
  return Number(avecCompta ? offre.prix_ht_avec_compta : offre.prix_ht_sans_compta);
}

/** Prix « de référence » barré : le tarif sans comptabilité, affiché uniquement si l'interrupteur est sur ON. */
export function prixBarreHt(offre: Offre | undefined, avecCompta: boolean): number | null {
  if (!offre || !avecCompta) return null;
  const sans = Number(offre.prix_ht_sans_compta);
  const avec = Number(offre.prix_ht_avec_compta);
  return sans > avec ? sans : null;
}

export function offreParCode(offres: Offre[] | undefined, code: string | null | undefined) {
  return (offres ?? []).find((o) => o.code === code);
}
