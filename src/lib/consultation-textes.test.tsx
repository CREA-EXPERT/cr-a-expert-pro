import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConsultationExpertCard } from "@/components/ConsultationExpertCard";
import {
  CONSULTATION_DUREE,
  CONSULTATION_ENGAGEMENT,
  CONSULTATION_GARANTIE,
  CONSULTATION_PRIX,
  CONSULTATION_REASSURANCE,
  CONSULTATION_TEXTES_VERSION,
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
    expect(CONSULTATION_DUREE).toContain("durée indicative");
    expect(CONSULTATION_ENGAGEMENT).toContain("sans supplément");
    expect(CONSULTATION_GARANTIE).toContain("intégralement remboursée");
    expect(CONSULTATION_TEXTES_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });
});

describe("carte de consultation", () => {
  it("affiche les 3 points de réassurance issus de consultation-textes", () => {
    render(<ConsultationExpertCard />);
    for (const point of CONSULTATION_REASSURANCE) {
      expect(screen.getByText(point.texte)).toBeInTheDocument();
    }
  });

  it("affiche le prix et la durée à proximité du bouton, qui ouvre un nouvel onglet", () => {
    render(<ConsultationExpertCard />);
    expect(screen.getByTestId("consultation-prix")).toHaveTextContent("148,80 € TTC");
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
