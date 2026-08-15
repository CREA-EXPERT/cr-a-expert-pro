/**
 * Moteur de correspondance du comparateur : il ne rend jamais de verdict.
 * Pour chaque critère, il indique si la caractéristique de chaque famille de
 * formes correspond aux priorités déclarées, est neutre, ou constitue un point
 * de vigilance. Aucun texte ici : tous les libellés viennent de
 * `simulateur-textes.ts`.
 */

import {
  CRITERES,
  PASTILLES,
  SIMULATEUR_TEXTES_VERSION,
  COLONNE_SAS,
  COLONNE_SARL,
  phraseSynthese,
  type NiveauPastille,
  type LigneRestitutionEmail,
} from "./simulateur-textes";

export type Reponses = Record<string, string>;

export type LigneRestitution = {
  id: string;
  libelle: string;
  sas: { texte: string; niveau: NiveauPastille };
  sarl: { texte: string; niveau: NiveauPastille };
};

export type Restitution2 = {
  lignes: LigneRestitution[];
  synthese: string;
  formeRetenue: string | null;
  version: string;
};

type Paire = { sas: NiveauPastille; sarl: NiveauPastille };

const NEUTRE: Paire = { sas: "neutre", sarl: "neutre" };

function evaluer(id: string, r: Reponses): Paire {
  const b1 = r["b1"];
  const b2 = r["b2"];
  const b3 = r["b3"];
  const b4 = r["b4"];

  switch (id) {
    case "regime_social": {
      if (b3 === "retraite" || b1 === "tres_important" || b2 === "tres_important")
        return { sas: "correspond", sarl: "vigilance" };
      if (b3 === "net") return { sas: "vigilance", sarl: "correspond" };
      return NEUTRE;
    }
    case "maternite": {
      if (b1 === "tres_important") return { sas: "correspond", sarl: "vigilance" };
      if (b1 === "important") return { sas: "correspond", sarl: "neutre" };
      return NEUTRE;
    }
    case "maladie": {
      if (b2 === "tres_important") return { sas: "correspond", sarl: "vigilance" };
      if (b2 === "important") return { sas: "correspond", sarl: "neutre" };
      if (b2 === "prevoyance") return { sas: "neutre", sarl: "correspond" };
      return NEUTRE;
    }
    case "retraite": {
      if (b3 === "retraite") return { sas: "correspond", sarl: "vigilance" };
      if (b3 === "net") return { sas: "vigilance", sarl: "correspond" };
      if (b4 === "oui") return { sas: "neutre", sarl: "correspond" };
      return NEUTRE;
    }
    case "chomage": {
      const a2 = r["a2"];
      if (a2 === "essentiel") return { sas: "correspond", sarl: "vigilance" };
      if (a2 === "si_possible") return { sas: "correspond", sarl: "neutre" };
      return NEUTRE;
    }
    case "cout": {
      if (b3 === "net") return { sas: "vigilance", sarl: "correspond" };
      if (r["c1"] === "reguliere" && r["c2"] !== "plus_3000")
        return { sas: "neutre", sarl: "correspond" };
      if (r["c1"] === "non") return { sas: "correspond", sarl: "vigilance" };
      return NEUTRE;
    }
    case "dividendes": {
      const c3 = r["c3"];
      if (c3 === "dividendes") return { sas: "correspond", sarl: "vigilance" };
      if (c3 === "mixte") return { sas: "correspond", sarl: "neutre" };
      if (c3 === "remuneration") return { sas: "neutre", sarl: "neutre" };
      return NEUTRE;
    }
    case "conjoint": {
      if (r["d2"] === "oui") return { sas: "vigilance", sarl: "correspond" };
      if (r["d2"] === "peutetre") return { sas: "neutre", sarl: "correspond" };
      return NEUTRE;
    }
    case "fiscalite": {
      if (r["e2"] === "ir") return { sas: "neutre", sarl: "correspond" };
      if (r["e2"] === "is") return { sas: "correspond", sarl: "neutre" };
      return NEUTRE;
    }
    case "investisseurs": {
      if (r["d3"] === "oui") return { sas: "correspond", sarl: "vigilance" };
      if (r["d3"] === "peutetre") return { sas: "correspond", sarl: "neutre" };
      return NEUTRE;
    }
    case "cession": {
      if (r["d4"] === "oui") return { sas: "correspond", sarl: "vigilance" };
      if (r["d4"] === "peutetre") return { sas: "correspond", sarl: "neutre" };
      return NEUTRE;
    }
    case "formalisme": {
      if (r["e1"] === "souplesse") return { sas: "correspond", sarl: "vigilance" };
      if (r["e1"] === "encadre") return { sas: "vigilance", sarl: "correspond" };
      return NEUTRE;
    }
    default:
      return NEUTRE;
  }
}

/** Libellés des colonnes, adaptés au nombre d'associés déclaré. */
export function colonnes(r: Reponses) {
  const seul = r["d1"] === "seul";
  return {
    sas: seul ? "SASU" : COLONNE_SAS,
    sarl: seul ? "EURL" : COLONNE_SARL,
  };
}

export function construireRestitution(r: Reponses): Restitution2 {
  const lignes: LigneRestitution[] = CRITERES.map((c) => {
    const p = evaluer(c.id, r);
    return {
      id: c.id,
      libelle: c.libelle,
      sas: { texte: c.sas, niveau: p.sas },
      sarl: { texte: c.sarl, niveau: p.sarl },
    };
  });

  const scoreSas = lignes.filter((l) => l.sas.niveau === "correspond").length;
  const scoreSarl = lignes.filter((l) => l.sarl.niveau === "correspond").length;

  const col = colonnes(r);
  let formeRetenue: string | null = null;
  let cote: "sas" | "sarl" | null = null;
  if (scoreSas > scoreSarl) {
    formeRetenue = col.sas;
    cote = "sas";
  } else if (scoreSarl > scoreSas) {
    formeRetenue = col.sarl;
    cote = "sarl";
  }

  const points = cote
    ? lignes.filter((l) => l[cote].niveau === "correspond").map((l) => l.libelle)
    : [];
  const vigilances = cote
    ? lignes.filter((l) => l[cote].niveau === "vigilance").map((l) => l.libelle)
    : [];

  return {
    lignes,
    synthese: phraseSynthese({ forme: formeRetenue, points, vigilances }),
    formeRetenue,
    version: SIMULATEUR_TEXTES_VERSION,
  };
}

export function lignesPourEmail(res: Restitution2): LigneRestitutionEmail[] {
  return res.lignes.map((l) => ({ libelle: l.libelle, sas: l.sas, sarl: l.sarl }));
}

export function legendePastilles() {
  return [PASTILLES.correspond, PASTILLES.neutre, PASTILLES.vigilance];
}
