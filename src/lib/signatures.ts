import type { Tables } from "@/integrations/supabase/types";
import { isEI } from "./domain";
import { conjointConcerne, consentement1424, partenaireIndivisConcerne } from "./documents";
import type { Associe, Dossier } from "./documents";

export type SignatureRow = Tables<"signatures_electroniques">;
export type SignataireRow = Tables<"signatures_signataires">;

/** Causes génériques d'échec d'envoi — aucun détail technique n'est exposé. */
export const LIBELLE_CAUSE: Record<string, string> = {
  service_indisponible: "Service d'envoi momentanément indisponible.",
  adresse_invalide: "L'adresse email du signataire semble incorrecte.",
  trop_de_demandes: "Trop de demandes d'envoi ; réessayez dans quelques minutes.",
  envoi_refuse: "L'email n'a pas pu être remis au signataire.",
  plafond_atteint: "Nombre maximal de tentatives atteint.",
  signataire_indisponible: "Ce signataire ne peut pas être relancé.",
  document_indisponible: "Document momentanément indisponible.",
};

export const texteCause = (cause: string | null | undefined) =>
  (cause && LIBELLE_CAUSE[cause]) || "L'envoi n'a pas abouti. Vous pouvez réessayer.";


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
    type: "sig_statuts",
    libelle: "Statuts de la société",
    aide: "Les statuts fixent les règles de fonctionnement de la société. Ils sont signés par l'ensemble des associés.",
    ordre: 5,
    societeUniquement: true,
  },
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
    type: "sig_consentement_partenaire_indivis",
    libelle: "Consentement du partenaire co-indivisaire",
    aide: "Le partenaire de PACS soumis à l'indivision consent à l'emploi de fonds indivis (art. 815-3 du Code civil). Il doit être signé avant les statuts.",
    ordre: 1,
    societeUniquement: true,
  },
  {
    type: "sig_consentement_conjoint_1424",
    libelle: "Consentement du conjoint à l'apport d'un bien commun",
    aide: "L'apport d'un bien commun soumis à cogestion exige le consentement du conjoint (art. 1424 du Code civil). Il doit être signé avant les statuts.",
    ordre: 2,
  },
  {
    type: "sig_mandat_guichet_unique",
    libelle: "Mandat de dépôt sur le guichet unique",
    aide: "Vous nous autorisez à déposer votre dossier sur le guichet unique des formalités des entreprises. Ce mandat est limité à cette seule formalité : il ne donne aucun autre pouvoir sur votre société.",
    ordre: 40,
  },
];

/** Modèle PDF correspondant à chaque document à signer. */
export const PDF_POUR_SIGNATURE: Record<string, string> = {
  sig_statuts: "statuts",
  sig_non_condamnation: "non_condamnation",
  sig_domiciliation: "attestation_domiciliation",
  sig_confidentialite_adresse: "confidentialite_adresse",
  sig_mandat_guichet_unique: "mandat_guichet_unique",
  sig_consentement_partenaire_indivis: "consentement_partenaire_indivis",
  sig_consentement_conjoint_1424: "consentement_conjoint_1424",
};

export const ETAPES_SIGNATURE = [
  { value: "a_preparer", label: "En préparation par nos soins" },
  { value: "a_signer", label: "À signer" },
  { value: "partiellement_signe", label: "Signé par une partie des signataires" },
  { value: "signe", label: "Signé" },
  { value: "annule", label: "Annulé" },
  { value: "sans_objet", label: "Sans objet" },
  /** Ancienne valeur encore présente en base. */
  { value: "pret", label: "À signer" },
  { value: "envoye", label: "À signer" },
] as const;

export const LABEL_SIGNATURE = (statut: string) =>
  ETAPES_SIGNATURE.find((e) => e.value === statut)?.label ?? "En préparation par nos soins";

export const ORDRE_SIGNATURE = ["a_preparer", "a_signer", "partiellement_signe", "signe"];

/** Position du document dans le déroulé, tolérante aux anciennes valeurs. */
export function etapeCourante(statut: string) {
  if (statut === "pret" || statut === "envoye") return 1;
  const i = ORDRE_SIGNATURE.indexOf(statut);
  return i < 0 ? 0 : i;
}

/** Lignes de suivi à créer pour un dossier, selon sa forme et ses associés. */
export function construireSignatures(dossier: Dossier, associes: Associe[]): SignatureDraft[] {
  const ei = isEI(dossier.forme_juridique);
  const aPersonnePhysique = associes.some((a) => a.type === "personne_physique");
  return MODELES_SIGNATURE.filter((m) => {
    if (m.societeUniquement && ei) return false;
    if (m.type === "sig_confidentialite_adresse") return aPersonnePhysique;
    if (m.type === "sig_non_condamnation") return true;
    if (m.type === "sig_domiciliation") return !ei || dossier.siege_type === "domicile";
    if (m.type === "sig_consentement_partenaire_indivis")
      return associes.some(partenaireIndivisConcerne);
    if (m.type === "sig_consentement_conjoint_1424") return consentement1424(dossier, associes).requis;
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

export type SignataireRequis = {
  associeId: string | null;
  nom: string;
  email: string | null;
};

function nomDe(a: Associe) {
  return a.type === "personne_morale"
    ? (a.denomination ?? "Personne morale")
    : `${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "Associé";
}

function versRequis(a: Associe): SignataireRequis {
  return {
    associeId: a.id,
    nom: a.type === "personne_morale" ? `${nomDe(a)} — ${a.representant ?? "représentant légal"}` : nomDe(a),
    email: a.email ?? null,
  };
}

/**
 * Signataires requis d'un document, déduits du dossier et de la situation déclarée.
 * Source unique partagée par l'interface cabinet et le moteur de signature.
 */
export function signatairesRequis(
  typeDocument: string,
  dossier: Dossier,
  associes: Associe[],
): SignataireRequis[] {
  const physiques = associes.filter((a) => a.type === "personne_physique");
  const dirigeants = associes.filter((a) => a.est_dirigeant);
  const associesTitres = associes.filter((a) => a.est_associe);

  switch (typeDocument) {
    case "sig_statuts":
      return (associesTitres.length > 0 ? associesTitres : associes).map(versRequis);
    case "sig_non_condamnation":
      return dirigeants.filter((a) => a.type === "personne_physique").map(versRequis);
    case "sig_domiciliation": {
      const hebergeant =
        dossier.siege_type === "domicile"
          ? (dirigeants[0] ?? physiques[0])
          : (dirigeants[0] ?? associes[0]);
      return hebergeant ? [versRequis(hebergeant)] : [];
    }
    case "sig_confidentialite_adresse":
      return physiques.map(versRequis);
    case "sig_consentement_partenaire_indivis":
      return physiques.filter(partenaireIndivisConcerne).map(versRequis);
    case "sig_consentement_conjoint_1424":
      return consentement1424(dossier, associes).apporteurs.map(versRequis);
    case "sig_mandat_guichet_unique":
      return (dirigeants.length > 0 ? dirigeants : associes).map(versRequis);
    default:
      return (dirigeants.length > 0 ? dirigeants : associes).map(versRequis);
  }
}

/** Statut du document déduit de l'état de ses signataires. */
export function statutDepuisSignataires(signataires: { horodatage: string | null }[]) {
  if (signataires.length === 0) return "a_signer";
  const signes = signataires.filter((s) => s.horodatage).length;
  if (signes === 0) return "a_signer";
  if (signes < signataires.length) return "partiellement_signe";
  return "signe";
}
