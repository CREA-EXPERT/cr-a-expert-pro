import { describe, expect, it } from "vitest";
import {
  extraireMeta,
  journalCsv,
  lignesConformite,
  motifRecurrent,
  suffixeMeta,
  TYPE_BLOQUEE,
  TYPE_REUSSIE,
  versionGabarit,
} from "./conformite";
import { VERSIONS_GABARIT } from "./gabarits";

const bloque = (motifs: string[], date: string, meta = " [gabarit=SAS; version=SAS-2026.1; auteur=jean@example.fr]") => ({
  type_event: TYPE_BLOQUEE,
  message: `Génération des statuts bloquée — ${motifs.length} point à traiter : ${motifs.join(" ; ")}.${meta}`,
  created_at: date,
});

describe("métadonnées des événements de conformité", () => {
  it("inscrit le gabarit, la version et l'auteur puis les relit", () => {
    const suffixe = suffixeMeta({ gabarit: "SARL", version: VERSIONS_GABARIT.SARL, auteur: "a@b.fr" });
    expect(suffixe).toContain("gabarit=SARL");
    expect(suffixe).toContain(`version=${VERSIONS_GABARIT.SARL}`);
    const { message, meta } = extraireMeta(`Projet de statuts généré.${suffixe}`);
    expect(message).toBe("Projet de statuts généré.");
    expect(meta).toEqual({ gabarit: "SARL", version: VERSIONS_GABARIT.SARL, auteur: "a@b.fr" });
  });

  it("déduit la version depuis le gabarit", () => {
    expect(versionGabarit("SCI")).toBe(VERSIONS_GABARIT.SCI);
    expect(versionGabarit(null)).toBe("");
  });

  it("expose le gabarit et la version sur les lignes de journal", () => {
    const [ligne] = lignesConformite([bloque(["Dénomination sociale"], "2026-08-10T10:00:00.000Z")]);
    expect(ligne!.gabarit).toBe("SAS");
    expect(ligne!.version).toBe("SAS-2026.1");
    expect(ligne!.auteur).toBe("jean@example.fr");
    expect(ligne!.motifs).toEqual(["Dénomination sociale"]);
  });
});

describe("motif récurrent", () => {
  const lignes = lignesConformite([
    bloque(["Dénomination sociale", "Banque de dépôt"], "2026-08-10T10:00:00.000Z"),
    bloque(["Dénomination sociale"], "2026-08-09T10:00:00.000Z"),
    { type_event: TYPE_REUSSIE, message: "Projet de statuts généré.", created_at: "2026-08-11T10:00:00.000Z" },
  ]);

  it("retient un motif présent dans au moins deux refus", () => {
    expect(motifRecurrent(lignes)).toBe("Dénomination sociale");
  });

  it("ne retient rien en dessous du seuil", () => {
    expect(motifRecurrent(lignes.slice(0, 1))).toBeNull();
    expect(motifRecurrent(lignes, 3)).toBeNull();
  });
});

describe("export CSV enrichi", () => {
  const lignes = lignesConformite([bloque(["Dénomination sociale"], "2026-08-10T10:00:00.000Z")]).map(
    (l) => ({ ...l, dossierId: "d-1", denomination: "ESSAI CONSEIL" }),
  );
  const csv = journalCsv("Suivi de conformité", lignes);

  it("comporte les colonnes gabarit et version", () => {
    expect(csv).toContain('"Gabarit";"Version du gabarit"');
    expect(csv).toContain('"Dossier";"Identifiant du dossier";"Utilisateur"');
  });

  it("renseigne les valeurs de gabarit, version, dossier et auteur", () => {
    expect(csv).toContain('"SAS";"SAS-2026.1"');
    expect(csv).toContain('"ESSAI CONSEIL";"d-1";"jean@example.fr"');
    expect(csv).toContain('"Refusé";"1";"Dénomination sociale"');
  });

  it("reste ouvrable dans un tableur français (BOM et point-virgule)", () => {
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.split("\n")[1]!.split(";").length).toBe(10);
  });
});
