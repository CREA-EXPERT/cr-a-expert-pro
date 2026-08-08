import type { Tables } from "@/integrations/supabase/types";
import { isEI } from "./domain";
import type { Associe, Dossier } from "./documents";

export type SignatureRow = Tables<"signatures_electroniques">;

export type SignatureDraft = {
  dossier_id: string;
  type_document: string;
  libelle: string;
  aide_client: string;
  ordre: number;
  statut: string;
};

/** Documents que la plateforme fait signer électroniquement (envoi géré par nos soins). */
export const MODELES_SIGNATURE: {
  type: string;
  libelle: string;
  aide: string;
  ordre: number;
  /** Faux lorsque le document n'a pas de sens en entreprise individuelle. */
  societeUniquement?: boolean;
}[] = [
  {
    type: "sig_non_condamnation",
    libelle: "Attestation de non-condamnation et de filiation",
    aide: "Chaque dirigeant déclare n'avoir fait l'objet d'aucune condamnation interdisant de gérer, et indique les nom et prénoms de ses parents. Le greffe exige cette attestation signée pour immatriculer la société.",
    ordre: 10,
  },
  {
    type: "sig_domiciliation",
    libelle: "Attestation de domiciliation du siège social",
    aide: "Le propriétaire des locaux, ou le dirigeant lui-même s'il domicilie chez lui, atteste que la société peut y fixer son siège.",
    ordre: 20,
  },
  {
    type: "sig_confidentialite_adresse",
    libelle: "Demande de confidentialité de l'adresse personnelle des associés",
    ordre: 30,
    aide: "Permet de ne pas rendre publique l'adresse personnelle des personnes physiques dans les registres consultables par tous.",
  },
  {
    type: "sig_mandat_guichet_unique",
    libelle: "Mandat de dépôt sur le guichet unique",
    aide: "Vous nous autorisez à déposer votre dossier sur le guichet unique des formalités des entreprises. Ce mandat est limité à cette seule formalité : il ne donne aucun autre pouvoir sur votre société.",
    ordre: 40,
  },
];

export const ETAPES_SIGNATURE = [
  { value: "a_preparer", label: "En préparation par nos soins" },
  { value: "pret", label: "Prêt à être envoyé" },
  { value: "envoye", label: "Envoyé pour signature" },
  { value: "signe", label: "Signé" },
  { value: "sans_objet", label: "Sans objet" },
] as const;

export const LABEL_SIGNATURE = (statut: string) =>
  ETAPES_SIGNATURE.find((e) => e.value === statut)?.label ?? "En préparation par nos soins";

export const ORDRE_SIGNATURE = ["a_preparer", "pret", "envoye", "signe"];

/** Lignes de suivi à créer pour un dossier, selon sa forme et ses associés. */
export function construireSignatures(dossier: Dossier, associes: Associe[]): SignatureDraft[] {
  const ei = isEI(dossier.forme_juridique);
  const aPersonnePhysique = associes.some((a) => a.type === "personne_physique");
  return MODELES_SIGNATURE.filter((m) => {
    if (m.type === "sig_confidentialite_adresse") return aPersonnePhysique;
    if (m.type === "sig_non_condamnation") return true;
    if (m.type === "sig_domiciliation") return !ei || dossier.siege_type === "domicile";
    return true;
  }).map((m) => ({
    dossier_id: dossier.id,
    type_document: m.type,
    libelle: m.libelle,
    aide_client: m.aide,
    ordre: m.ordre,
    statut: "a_preparer",
  }));
}
