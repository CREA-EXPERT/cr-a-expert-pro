import { describe, expect, it } from "vitest";
import {
  CRITERES,
  DISCLAIMER_SIMULATEUR,
  QUESTIONS,
  SIMULATEUR_TEXTES_VERSION,
  emailRestitutionHtml,
  phraseSynthese,
} from "./simulateur-textes";
import { construireRestitution, lignesPourEmail } from "./simulateur-moteur";
import { construireJournalSimulation } from "./simulateur-journal";

const INTERDITS = [
  "nous vous recommandons",
  "nous vous conseillons",
  "vous devez choisir",
  "choisissez la",
  "la meilleure forme pour vous",
  "il faut opter pour",
  "notre conseil",
  "optez pour",
];

function normaliser(t: string) {
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tousLesTextes() {
  const res = construireRestitution({});
  return [
    ...QUESTIONS.flatMap((q) => [q.intitule, q.pourquoi ?? "", ...q.options.map((o) => o.l)]),
    ...CRITERES.flatMap((c) => [c.libelle, c.sas, c.sarl]),
    DISCLAIMER_SIMULATEUR,
    res.synthese,
    phraseSynthese({ forme: "SAS / SASU", points: ["Retraite"], vigilances: ["Coût"] }),
    emailRestitutionHtml({
      prenom: "Camille",
      lignes: lignesPourEmail(res),
      synthese: res.synthese,
    }),
  ].join("\n");
}

describe("phrases interdites", () => {
  const corpus = normaliser(tousLesTextes());
  for (const phrase of INTERDITS) {
    it(`n'emploie jamais « ${phrase} »`, () => {
      expect(corpus.includes(normaliser(phrase))).toBe(false);
    });
  }
});

describe("disclaimers", () => {
  it("figure deux fois dans l'email", () => {
    const res = construireRestitution({});
    const html = emailRestitutionHtml({
      prenom: "",
      lignes: lignesPourEmail(res),
      synthese: res.synthese,
    });
    const occurrences = html.split(DISCLAIMER_SIMULATEUR.replace(/'/g, "'")).length - 1;
    expect(occurrences).toBe(2);
  });

  it("est utilisé par la page de restitution", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/routes/simulateur.tsx", "utf8"),
    );
    expect(source).toContain("DISCLAIMER_SIMULATEUR");
    expect(source.match(/<BlocDisclaimer/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("ne demande aucune donnée de santé", () => {
    const corpus = normaliser(QUESTIONS.map((q) => q.intitule).join(" "));
    for (const mot of ["etes-vous enceinte", "votre etat de sante", "maladie chronique"]) {
      expect(corpus.includes(mot)).toBe(false);
    }
  });
});

describe("moteur de correspondance", () => {
  const niveau = (r: ReturnType<typeof construireRestitution>, id: string, c: "sas" | "sarl") =>
    r.lignes.find((l) => l.id === id)![c].niveau;

  it("profil ARE + dividendes + investisseurs", () => {
    const r = construireRestitution({
      a1: "are",
      a2: "essentiel",
      c3: "dividendes",
      d3: "oui",
      d1: "seul",
    });
    expect(niveau(r, "chomage", "sas")).toBe("correspond");
    expect(niveau(r, "dividendes", "sas")).toBe("correspond");
    expect(niveau(r, "investisseurs", "sas")).toBe("correspond");
    expect(r.formeRetenue).toBe("SASU");
  });

  it("profil conjoint collaborateur + net immédiat + pas d'investisseurs", () => {
    const r = construireRestitution({
      d1: "plusieurs",
      d2: "oui",
      b3: "net",
      d3: "non",
    });
    expect(niveau(r, "conjoint", "sarl")).toBe("correspond");
    expect(niveau(r, "cout", "sarl")).toBe("correspond");
    expect(r.formeRetenue).toBe("SARL / EURL");
  });

  it("profil neutre : aucune forme n'obtient 100 % de correspondances", () => {
    const r = construireRestitution({});
    for (const cote of ["sas", "sarl"] as const) {
      const pleins = r.lignes.filter((l) => l[cote].niveau === "correspond").length;
      expect(pleins).toBeLessThan(r.lignes.length);
    }
    expect(r.formeRetenue).toBeNull();
  });
});

describe("journalisation", () => {
  it("consigne la version des textes", () => {
    const res = construireRestitution({ d1: "seul", d3: "oui" });
    const entree = construireJournalSimulation({
      email: "test@example.com",
      reponses: { d1: "seul", d3: "oui" },
      formeRetenue: res.formeRetenue,
      restitutionTexte: res.synthese,
    });
    expect(entree.version_textes).toBe(SIMULATEUR_TEXTES_VERSION);
    expect(JSON.stringify(entree)).toContain(SIMULATEUR_TEXTES_VERSION);
    expect(entree.empreinte_restitution).toMatch(/^[0-9a-f]{8}$/);
  });
});
