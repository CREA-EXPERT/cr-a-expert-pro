import { describe, expect, it } from "vitest";
import {
  classerHomonymes,
  revuesDenomination,
  revueSystematique,
  termesReglementesDetectes,
  type EntrepriseHomonyme,
} from "./denomination";
import { alertesStatuts } from "./statuts-controles";
import type { Associe, Dossier } from "./documents";

const homonyme = (naf: string | null): EntrepriseHomonyme => ({
  nom: "ESSAI CONSEIL",
  siren: `${Math.random()}`,
  naf,
  commune: "Lyon",
});

describe("classement des homonymes", () => {
  it("aucun homonyme", () => {
    expect(classerHomonymes([], ["70.22Z"])).toBe("aucun");
  });

  it("activités éloignées", () => {
    expect(classerHomonymes([homonyme("47.11F")], ["70.22Z"])).toBe("eloigne");
  });

  it("code NAF identique", () => {
    expect(classerHomonymes([homonyme("70.22Z")], ["70.22Z"])).toBe("proche");
  });

  it("même division NAF", () => {
    expect(classerHomonymes([homonyme("70.10Z")], ["70.22Z"])).toBe("proche");
  });

  it("sans code d'activité au dossier, le risque reste éloigné", () => {
    expect(classerHomonymes([homonyme("70.22Z")], [])).toBe("eloigne");
  });
});

describe("termes réglementés", () => {
  it("insensible à la casse et aux accents", () => {
    expect(termesReglementesDetectes("SOCIETE DE CREDIT")).toEqual(["crédit"]);
    expect(termesReglementesDetectes("Cabinet Expert-Comptable Durand")).toEqual([
      "expert-comptable",
    ]);
  });

  it("aucun terme sur une dénomination neutre", () => {
    expect(termesReglementesDetectes("ESSAI CONSEIL")).toEqual([]);
  });

  it("revue systématique pour les professions du chiffre", () => {
    expect(revueSystematique(["expert-comptable"])).toBe(true);
    expect(revueSystematique(["assurance"])).toBe(false);
  });
});

describe("aucun blocage lié à la dénomination", () => {
  const dossier = {
    id: "d",
    forme_juridique: "SAS",
    denomination: "BANQUE ESSAI",
    denomination_risque: "proche",
    siege_adresse: "12 rue des Lilas, 69003 Lyon",
    objet_social: "Conseil.",
    capital_montant: 1000,
    valeur_part: 10,
    banque_depot: "Banque de l'Ouest",
    ville_signature: "Lyon",
    date_signature: "2026-08-01",
    date_consentements: "2026-08-01",
  } as unknown as Dossier;
  const associes: Associe[] = [];

  it("les points de dénomination sont des revues, jamais des blocages", () => {
    const a = alertesStatuts(dossier, associes);
    expect(a.bloquantes.join(" ")).not.toMatch(/dénomination/i);
    expect(a.revues.join(" ")).toMatch(/terme réservé ou réglementé/i);
    expect(a.revues.join(" ")).toMatch(/activité proche/i);
  });

  it("revuesDenomination ne renvoie rien sans risque ni terme", () => {
    expect(revuesDenomination("ESSAI CONSEIL", "eloigne")).toEqual([]);
  });
});
