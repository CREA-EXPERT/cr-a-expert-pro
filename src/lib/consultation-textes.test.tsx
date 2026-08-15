import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConsultationExpertCard } from "@/components/ConsultationExpertCard";
import {
  CONSULTATION_DUREE,
  CONSULTATION_ENGAGEMENT,
  CONSULTATION_GARANTIE,
  CONSULTATION_PRIX,
  CONSULTATION_SOUS_BOUTON,
  CONSULTATION_TEXTES_VERSION,
  PRIX_CONSULTATION,
  URL_CALENDLY_CONSULTATION,
} from "./consultation-textes";
import { piecesFacultatives } from "./test-mode";

const INTERDITS = ["30 min", "30 minutes", "demi-heure", "trente minutes"];

const FICHIERS_CONSULTATION = [
  "src/lib/consultation-textes.ts",
  "src/components/ConsultationExpertCard.tsx",
  "src/routes/contact.tsx",
  "src/routes/cgu.tsx",
];

describe("textes de la consultation", () => {
  it("ne mentionne jamais une durée en minutes", () => {
    for (const fichier of FICHIERS_CONSULTATION) {
      const contenu = readFileSync(fichier, "utf8").toLowerCase();
      for (const interdit of INTERDITS) {
        expect(`${fichier}:${interdit}:${contenu.includes(interdit)}`).toBe(
          `${fichier}:${interdit}:false`,
        );
      }
    }
  });

  it("expose une durée d'1 heure, l'engagement et la garantie", () => {
    expect(CONSULTATION_DUREE).toContain("1 heure");
    expect(CONSULTATION_DUREE).not.toContain("durée indicative");
    expect(CONSULTATION_ENGAGEMENT).toContain("sans supplément");
    expect(CONSULTATION_GARANTIE).toContain("intégralement remboursée");
    expect(CONSULTATION_TEXTES_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });
});

describe("carte de consultation", () => {
  it("affiche sous le bouton le libellé centralisé, à l'identique", () => {
    render(<ConsultationExpertCard />);
    const bloc = screen.getByTestId("consultation-sous-bouton");
    expect(bloc.textContent).toBe(CONSULTATION_SOUS_BOUTON);
    expect(CONSULTATION_SOUS_BOUTON).toBe(
      "Consultation d' 1h avec un expert-comptable. 148,80 € TTC ( TVA 20 %). La durée est indicative, on traite le problème jusqu'au bout.",
    );
  });

  it("relie le bouton à son libellé (aria-describedby) et n'affiche plus le bloc réassurance", () => {
    render(<ConsultationExpertCard />);
    const lien = screen.getByTestId("bouton-consultation");
    expect(lien.getAttribute("aria-describedby")).toBe(
      screen.getByTestId("consultation-sous-bouton").id,
    );
    expect(screen.queryByTestId("consultation-reassurance")).toBeNull();
  });

  it("ne contient plus les mentions supprimées", () => {
    const sources = FICHIERS_CONSULTATION.map((f) => readFileSync(f, "utf8")).join("\n");
    for (const interdit of ["Pas de chronomètre", "sans supplément.", "(durée indicative)"]) {
      expect(`${interdit}:${sources.includes(interdit)}`).toBe(`${interdit}:false`);
    }
  });

  it("justifie les paragraphes par défaut dans la feuille de style", () => {
    const css = readFileSync("src/styles.css", "utf8");
    expect(css).toMatch(/p\s*\{[^}]*text-align:\s*justify/);
    expect(css).toContain("@media print");
  });

  it("affiche le prix et la durée à proximité du bouton, qui ouvre un nouvel onglet", () => {
    render(<ConsultationExpertCard />);
    expect(screen.getByTestId("consultation-prix")).toHaveTextContent(PRIX_CONSULTATION.ttc);
    expect(screen.getByTestId("consultation-prix")).toHaveTextContent("1 heure");
    const lien = screen.getByTestId("bouton-consultation");
    expect(lien).toHaveAttribute("href", URL_CALENDLY_CONSULTATION);
    expect(lien).toHaveAttribute("target", "_blank");
    expect(lien).toHaveAttribute("rel", "noopener noreferrer");
    expect(lien.getAttribute("aria-label")).toContain("1 heure");
  });

  it("estampille la version des textes affichés", () => {
    const { container } = render(<ConsultationExpertCard />);
    expect(container.querySelector(`[data-textes-version="${CONSULTATION_TEXTES_VERSION}"]`)).toBeTruthy();
  });
});

describe("verrou de complétude du parcours réel", () => {
  it("ne lève jamais le verrou pour un dossier non-test", () => {
    expect(piecesFacultatives({ est_test: false, documents_plus_tard: true })).toBe(false);
    expect(piecesFacultatives({ est_test: true, documents_plus_tard: true })).toBe(true);
  });
});

describe("garde serveur des coulisses", () => {
  it("refuse les dossiers non-test côté serveur", () => {
    const source = readFileSync("src/lib/coulisses.functions.ts", "utf8");
    expect(source).toContain('est_test !== true');
    expect(source).toContain("status: 403");
  });
});
