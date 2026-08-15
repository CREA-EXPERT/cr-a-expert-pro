import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATEGORIES_AVEC_ENVOI,
  PRIX_CONSULTATION,
  declencheEnvoi,
  objetEmailContact,
} from "./contact";

function fichiers(racine: string, acc: string[] = []) {
  for (const nom of readdirSync(racine)) {
    const chemin = join(racine, nom);
    if (statSync(chemin).isDirectory()) fichiers(chemin, acc);
    else if (/\.(ts|tsx)$/.test(nom)) acc.push(chemin);
  }
  return acc;
}

describe("source unique du prix de la consultation", () => {
  it("n'écrit « 148,80 » nulle part ailleurs que dans contact.ts", () => {
    const fautifs = fichiers("src").filter(
      (f) => !f.endsWith("contact.ts") && !f.endsWith("contact.test.ts") && readFileSync(f, "utf8").includes("148,80"),
    );
    expect(fautifs).toEqual([]);
    expect(PRIX_CONSULTATION.ttc).toBe("148,80 €");
  });

  it("bannit « rappel gratuit » et « sans engagement » des composants publics", () => {
    const fautifs = fichiers("src/components")
      .concat(fichiers("src/routes"))
      .filter((f) => {
        const t = readFileSync(f, "utf8").toLowerCase();
        return t.includes("rappel gratuit") || t.includes("sans engagement");
      });
    expect(fautifs).toEqual([]);
  });
});

describe("politique de contact", () => {
  it("n'envoie un email que pour les catégories a à d", () => {
    expect(CATEGORIES_AVEC_ENVOI).toEqual(["amelioration", "bug", "dossier", "paiement"]);
    expect(declencheEnvoi("autre")).toBe(false);
    expect(objetEmailContact("autre")).toBeNull();
  });

  it("préfixe l'objet et joint l'identifiant du dossier", () => {
    expect(objetEmailContact("bug")).toContain("[BUG]");
    expect(objetEmailContact("dossier", "abc-123")).toContain("[DOSSIER abc-123]");
  });
});

describe("anti-abus", () => {
  it("applique une limitation de fréquence sur l'envoi de contact", () => {
    const source = readFileSync("src/lib/contact.functions.ts", "utf8");
    expect(source).toContain('verifierLimite("contact"');
  });
});
