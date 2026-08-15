import { describe, expect, it } from "vitest";
import {
  aujourdhuiISO,
  contratMariageValide,
  resumeContratMariage,
  validerContratMariage,
  verifierDateContrat,
  verifierEtudeNotariale,
  verifierNotaire,
} from "./contrat-mariage";

const MAINTENANT = new Date(Date.UTC(2026, 7, 15, 12, 0, 0)); // 15 août 2026

describe("date du contrat de mariage", () => {
  it("accepte une date passée valide", () => {
    expect(verifierDateContrat("2015-06-30", MAINTENANT)).toBeNull();
  });

  it("accepte la date du jour", () => {
    expect(verifierDateContrat(aujourdhuiISO(MAINTENANT), MAINTENANT)).toBeNull();
    expect(verifierDateContrat("2026-08-15", MAINTENANT)).toBeNull();
  });

  it("refuse le lendemain", () => {
    expect(verifierDateContrat("2026-08-16", MAINTENANT)).toBe(
      "La date de l'acte ne peut pas être postérieure à aujourd'hui.",
    );
  });

  it("accepte le 29 février d'une année bissextile", () => {
    expect(verifierDateContrat("2024-02-29", MAINTENANT)).toBeNull();
    expect(verifierDateContrat("2000-02-29", MAINTENANT)).toBeNull();
  });

  it("refuse le 29 février d'une année non bissextile", () => {
    expect(verifierDateContrat("2023-02-29", MAINTENANT)).toContain("n'existe pas au calendrier");
    expect(verifierDateContrat("1900-02-29", MAINTENANT)).toContain("n'existe pas au calendrier");
  });

  it("refuse les jours et mois hors calendrier", () => {
    expect(verifierDateContrat("2020-04-31", MAINTENANT)).toContain("n'existe pas");
    expect(verifierDateContrat("2020-13-01", MAINTENANT)).toContain("n'existe pas");
    expect(verifierDateContrat("2020-00-10", MAINTENANT)).toContain("n'existe pas");
  });

  it("refuse une date vide, incomplète ou mal formée", () => {
    expect(verifierDateContrat("", MAINTENANT)).toContain("Indiquez la date");
    expect(verifierDateContrat(null, MAINTENANT)).toContain("Indiquez la date");
    expect(verifierDateContrat("2020-05", MAINTENANT)).toContain("mal formée");
    expect(verifierDateContrat("30/06/2015", MAINTENANT)).toContain("mal formée");
  });

  it("refuse une année antérieure à 1900", () => {
    expect(verifierDateContrat("1899-12-31", MAINTENANT)).toContain("antérieure à 1900");
    expect(verifierDateContrat("1900-01-01", MAINTENANT)).toBeNull();
  });
});

describe("étude notariale et notaire", () => {
  it("exige un libellé d'étude exploitable", () => {
    expect(verifierEtudeNotariale("SCP Martin & Associés, Nancy")).toBeNull();
    expect(verifierEtudeNotariale("")).toContain("Indiquez l'étude");
    expect(verifierEtudeNotariale("A")).toContain("trop court");
    expect(verifierEtudeNotariale("123456")).toContain("invalide");
    expect(verifierEtudeNotariale("x".repeat(151))).toContain("trop long");
  });

  it("exige un nom de notaire en lettres", () => {
    expect(verifierNotaire("Maître Claire Martin")).toBeNull();
    expect(verifierNotaire("Jean-Pierre O'Neil")).toBeNull();
    expect(verifierNotaire("")).toContain("Indiquez le nom du notaire");
    expect(verifierNotaire("Ab")).toContain("trop court");
    expect(verifierNotaire("Martin 75")).toContain("invalide");
  });
});

describe("validation d'ensemble", () => {
  const base = {
    contrat_mariage: true,
    contrat_mariage_etude: "SCP Martin & Associés, Nancy",
    contrat_mariage_notaire: "Maître Claire Martin",
    contrat_mariage_date: "2015-06-30",
  };

  it("ne contrôle rien en l'absence de contrat", () => {
    expect(validerContratMariage({ contrat_mariage: false }, MAINTENANT)).toEqual({});
  });

  it("valide une saisie complète", () => {
    expect(contratMariageValide(base, MAINTENANT)).toBe(true);
  });

  it("bloque tant qu'un champ est incohérent", () => {
    const err = validerContratMariage(
      { ...base, contrat_mariage_date: "2099-01-01", contrat_mariage_notaire: "" },
      MAINTENANT,
    );
    expect(err.date).toBeTruthy();
    expect(err.notaire).toBeTruthy();
    expect(contratMariageValide({ ...base, contrat_mariage_etude: "" }, MAINTENANT)).toBe(false);
  });

  it("compose un résumé lisible pour les documents", () => {
    expect(resumeContratMariage(base)).toBe(
      "Acte du 30/06/2015 — Notaire : Maître Claire Martin — Étude : SCP Martin & Associés, Nancy",
    );
  });
});
