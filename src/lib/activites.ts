import type { Tables } from "@/integrations/supabase/types";

export type SourceActivite = "type" | "naf" | "libre";

/** Une activité de l'objet social : bloc autonome, qui connaît sa source et porte ses données. */
export type Activite = {
  id: string;
  source: SourceActivite;
  naf_code: string | null;
  naf_libelle: string | null;
  /** Texte statutaire : c'est lui qui figure dans les statuts. */
  texte: string;
  reglementee: boolean;
  justificatif_type: "diplome" | "experience" | null;
  justificatif_detail: string | null;
};

function identifiant() {
  try {
    return crypto.randomUUID();
  } catch {
    return `act-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }
}

export function nouvelleActivite(valeurs: Partial<Activite> & { texte: string }): Activite {
  return {
    id: valeurs.id ?? identifiant(),
    source: valeurs.source ?? "libre",
    naf_code: valeurs.naf_code ?? null,
    naf_libelle: valeurs.naf_libelle ?? null,
    texte: valeurs.texte,
    reglementee: valeurs.reglementee ?? false,
    justificatif_type: valeurs.justificatif_type ?? null,
    justificatif_detail: valeurs.justificatif_detail ?? null,
  };
}

/** Lecture tolérante de la colonne JSONB « activites ». */
export function normaliserActivites(valeur: unknown): Activite[] {
  if (!Array.isArray(valeur)) return [];
  return valeur
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) =>
      nouvelleActivite({
        id: typeof x["id"] === "string" ? (x["id"] as string) : identifiant(),
        source: (["type", "naf", "libre"] as string[]).includes(String(x["source"]))
          ? (x["source"] as SourceActivite)
          : "libre",
        naf_code: typeof x["naf_code"] === "string" ? (x["naf_code"] as string) : null,
        naf_libelle: typeof x["naf_libelle"] === "string" ? (x["naf_libelle"] as string) : null,
        texte: typeof x["texte"] === "string" ? (x["texte"] as string) : "",
        reglementee: x["reglementee"] === true,
        justificatif_type:
          x["justificatif_type"] === "diplome" || x["justificatif_type"] === "experience"
            ? (x["justificatif_type"] as "diplome" | "experience")
            : null,
        justificatif_detail:
          typeof x["justificatif_detail"] === "string" ? (x["justificatif_detail"] as string) : null,
      }),
    );
}

type DossierLike = Pick<
  Tables<"dossiers">,
  "objets_social" | "objet_social" | "activite_reglementee" | "justificatif_type" | "justificatif_detail"
> & { activites?: unknown };

/**
 * Activités d'un dossier. Compatibilité ascendante : à défaut de liste structurée,
 * les anciens objets sociaux sont relus comme des activités libres.
 */
export function activitesDuDossier(dossier: DossierLike): Activite[] {
  const liste = normaliserActivites(dossier.activites);
  if (liste.length > 0) return liste;
  const anciens =
    dossier.objets_social && dossier.objets_social.length > 0
      ? dossier.objets_social
      : dossier.objet_social
        ? [dossier.objet_social]
        : [];
  return anciens
    .filter((t) => t.trim())
    .map((texte) =>
      nouvelleActivite({
        texte,
        reglementee: dossier.activite_reglementee === true,
        justificatif_type:
          dossier.justificatif_type === "diplome" || dossier.justificatif_type === "experience"
            ? dossier.justificatif_type
            : null,
        justificatif_detail: dossier.justificatif_detail,
      }),
    );
}

/** Intitulé court d'une activité, pour les récapitulatifs et les libellés de pièces. */
export function libelleActivite(a: Activite, index = 0): string {
  if (a.naf_libelle) return a.naf_libelle;
  const t = a.texte.trim().replace(/\s+/g, " ");
  if (!t) return `Activité ${index + 1}`;
  if (t.length <= 70) return t.replace(/\.$/, "");
  return `${t.slice(0, 67).replace(/[\s,;]+\S*$/, "")}…`;
}

export function activitesReglementees(liste: Activite[]) {
  return liste.filter((a) => a.reglementee);
}

/**
 * Champs dérivés maintenus pour tous les écrans qui lisent encore l'objet social
 * consolidé, le caractère réglementé global ou le code d'activité principal.
 */
export function derivesActivites(liste: Activite[], autresRoutages = false) {
  const textes = liste.map((a) => a.texte.trim()).filter(Boolean);
  const reglementee = liste.some((a) => a.reglementee);
  const principale = liste[0] ?? null;
  return {
    activites: liste as unknown as Tables<"dossiers">["activites"],
    objets_social: liste.map((a) => a.texte),
    objet_social: textes.join(" "),
    activite_reglementee: reglementee,
    routage_cabinet: reglementee || autresRoutages,
    code_naf: principale?.naf_code ?? null,
    code_naf_libelle: principale?.naf_libelle ?? null,
  };
}
